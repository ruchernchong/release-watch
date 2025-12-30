import { logger } from "../lib/logger";

export type ReleaseCategory =
  | "major"
  | "minor"
  | "patch"
  | "security"
  | "breaking"
  | "unknown";

export interface AIAnalysisResult {
  summary: string;
  category: ReleaseCategory;
  hasBreakingChanges: boolean;
  highlights: string[];
}

const MODEL = "@cf/meta/llama-3-8b-instruct";

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A concise 2-3 sentence summary of the most important changes",
    },
    category: {
      type: "string",
      enum: ["major", "minor", "patch", "security", "breaking", "unknown"],
      description: "The release category based on semver and content",
    },
    hasBreakingChanges: {
      type: "boolean",
      description: "Whether the release contains breaking changes",
    },
    highlights: {
      type: "array",
      items: { type: "string" },
      description: "2-3 key highlights as brief bullet points",
      minItems: 0,
      maxItems: 3,
    },
  },
  required: ["summary", "category", "hasBreakingChanges", "highlights"],
} as const;

const SYSTEM_PROMPT = `You are a release notes analyzer. Given a GitHub release, you must analyze and categorize it.

Category rules:
- "major": Version X.0.0 or significant new features
- "minor": Version X.Y.0 or new features without breaking changes
- "patch": Version X.Y.Z or bug fixes only
- "security": Contains security fixes, CVE mentions, vulnerability patches
- "breaking": Contains breaking changes regardless of version
- "unknown": Cannot determine

Provide:
1. A concise 2-3 sentence summary of the most important changes
2. The release category
3. Whether there are breaking changes
4. 2-3 key highlights (brief bullet points)`;

export async function analyzeRelease(
  ai: Ai,
  repoName: string,
  tagName: string,
  releaseName: string | null,
  body: string | null,
): Promise<AIAnalysisResult | null> {
  if (!body || body.trim().length < 20) {
    return null;
  }

  const truncatedBody = body.slice(0, 6000);

  const userPrompt = `Analyze this GitHub release:

Repository: ${repoName}
Tag: ${tagName}
Release Name: ${releaseName || tagName}

Release Notes:
${truncatedBody}`;

  try {
    const response = await ai.run(MODEL, {
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
    });

    if (!response || typeof response !== "object") {
      logger.ai.error("Invalid response format", undefined, {
        repo: repoName,
        tag: tagName,
      });
      return null;
    }

    const result = "response" in response ? response.response : response;

    if (typeof result === "string") {
      return JSON.parse(result) as AIAnalysisResult;
    }

    return result as AIAnalysisResult;
  } catch (error) {
    logger.ai.error("Failed to analyze release", error, {
      repo: repoName,
      tag: tagName,
    });
    return null;
  }
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
