import type { AIAnalysisResult, ReleaseCategory } from "@shipradar/types";
import { logger } from "../lib/logger";

const MODEL = "minimax/m3" as keyof AiModels;
const MAX_RELEASE_NOTES_CHARS = 6000;
const DEFAULT_AI_GATEWAY_ID = "default";
const AI_GATEWAY_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const RELEASE_CATEGORIES = [
  "major",
  "minor",
  "patch",
  "security",
  "breaking",
  "unknown",
] as const satisfies readonly ReleaseCategory[];

const VALID_CATEGORIES = new Set<ReleaseCategory>(RELEASE_CATEGORIES);

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "One or two natural-language sentences for a mobile notification. No Markdown, raw URLs, headings, or changelog boilerplate.",
    },
    category: {
      type: "string",
      enum: RELEASE_CATEGORIES,
      description: "The release category based on semver and content",
    },
    hasBreakingChanges: {
      type: "boolean",
      description: "Whether the release contains breaking changes",
    },
    highlights: {
      type: "array",
      items: { type: "string" },
      description:
        "Two or three short, plain-language user-impact highlights. No Markdown, headings, links, or trailing punctuation unless needed.",
      minItems: 0,
      maxItems: 3,
    },
  },
  required: ["summary", "category", "hasBreakingChanges", "highlights"],
} as const;

const SYSTEM_PROMPT = `You rewrite GitHub release notes into concise Telegram notifications.

Convert technical Markdown release notes into plain natural language. Focus on what changed and why it matters to users. Ignore credits, sponsor notes, raw URLs, Markdown headings, code fences, and repeated changelog boilerplate unless they are essential to understanding the release.

Write for a small mobile screen:
- summary: one or two short sentences, ideally under 240 characters
- highlights: 2-3 brief user-impact bullets, each under 90 characters
- no Markdown syntax, raw links, headings, emoji, or copied boilerplate
- mention breaking changes only when they materially affect users

Category rules:
- "major": Version X.0.0 or significant new features
- "minor": Version X.Y.0 or new features without breaking changes
- "patch": Version X.Y.Z or bug fixes only
- "security": Contains security fixes, CVE mentions, vulnerability patches
- "breaking": Contains breaking changes regardless of version
- "unknown": Cannot determine

Provide:
1. A concise natural-language summary of the most important changes
2. The release category
3. Whether there are breaking changes
4. 2-3 short highlights`;

export async function analyzeRelease(
  ai: Ai,
  gatewayId: string | undefined,
  repoName: string,
  tagName: string,
  releaseName: string | null,
  body: string | null,
): Promise<AIAnalysisResult | null> {
  if (!body || body.trim().length < 20) {
    return null;
  }

  const userPrompt = buildReleaseAnalysisPrompt(
    repoName,
    tagName,
    releaseName,
    body,
  );

  try {
    const response = await ai.run(
      MODEL,
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "release_analysis",
            schema: ANALYSIS_SCHEMA,
            strict: true,
          },
        },
      },
      buildAiRunOptions(gatewayId, repoName, tagName),
    );

    if (!response || typeof response !== "object") {
      logger.ai.error("Invalid response format", undefined, {
        repo: repoName,
        tag: tagName,
      });
      return null;
    }

    const analysis = parseAnalysisResponse(response);

    if (!analysis) {
      logger.ai.error("Invalid AI analysis result", undefined, {
        repo: repoName,
        tag: tagName,
      });
    }

    return analysis;
  } catch (error) {
    logger.ai.error("Failed to analyze release", error, {
      repo: repoName,
      tag: tagName,
    });
    return null;
  }
}

function buildAiRunOptions(
  gatewayId: string | undefined,
  repoName: string,
  tagName: string,
): AiOptions {
  const id = gatewayId?.trim() || DEFAULT_AI_GATEWAY_ID;

  return {
    gateway: {
      id,
      skipCache: false,
      cacheTtl: AI_GATEWAY_CACHE_TTL_SECONDS,
      metadata: {
        app: "shipradar",
        feature: "release-analysis",
        model: MODEL,
        repo: repoName,
        tag: tagName,
      },
    },
  };
}

function buildReleaseAnalysisPrompt(
  repoName: string,
  tagName: string,
  releaseName: string | null,
  body: string,
): string {
  return `Rewrite this GitHub release into a concise Telegram notification digest.

Repository: ${repoName}
Tag: ${tagName}
Release Name: ${releaseName || tagName}

Release Notes:
${body.slice(0, MAX_RELEASE_NOTES_CHARS)}`;
}

function parseAnalysisResponse(response: unknown): AIAnalysisResult | null {
  const result = extractResponsePayload(response);

  if (typeof result === "string") {
    try {
      return normalizeAnalysis(JSON.parse(result));
    } catch {
      return null;
    }
  }

  return normalizeAnalysis(result);
}

function extractResponsePayload(response: unknown): unknown {
  if (!response || typeof response !== "object") {
    return response;
  }

  if ("response" in response) {
    return extractResponsePayload(response.response);
  }

  if ("content" in response) {
    return response.content;
  }

  return response;
}

function normalizeAnalysis(value: unknown): AIAnalysisResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const summary = truncateText(cleanModelText(candidate.summary), 280);
  const category = candidate.category;

  if (!summary || !isReleaseCategory(category)) {
    return null;
  }

  const highlights = Array.isArray(candidate.highlights)
    ? candidate.highlights
        .map(cleanModelText)
        .map((highlight) => truncateText(highlight, 110))
        .filter((highlight) => highlight.length > 0)
        .slice(0, 3)
    : [];

  return {
    summary,
    category,
    hasBreakingChanges:
      candidate.hasBreakingChanges === true || category === "breaking",
    highlights,
  };
}

function isReleaseCategory(value: unknown): value is ReleaseCategory {
  return (
    typeof value === "string" && VALID_CATEGORIES.has(value as ReleaseCategory)
  );
}

function cleanModelText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\(https?:\/\/[^\s)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[\t\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function categorizeByVersion(tagName: string): ReleaseCategory {
  const versionMatch = tagName.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) return "unknown";

  const [, , minor, patch] = versionMatch;

  if (patch !== "0" && minor !== "0") return "patch";
  if (minor !== "0" && patch === "0") return "minor";
  if (minor === "0" && patch === "0") return "major";

  return "unknown";
}
