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

const MODEL = "@cf/meta/llama-3.2-3b-instruct";

const SYSTEM_PROMPT = `You are a release notes analyzer. Given a GitHub release, you must:
1. Provide a concise 2-3 sentence summary of the most important changes
2. Categorize the release type based on semver and content
3. Identify if there are breaking changes
4. List 2-3 key highlights (brief bullet points)

Respond ONLY in valid JSON format with this structure:
{
  "summary": "Brief 2-3 sentence summary",
  "category": "major|minor|patch|security|breaking|unknown",
  "hasBreakingChanges": true|false,
  "highlights": ["highlight 1", "highlight 2"]
}

Category rules:
- "major": Version X.0.0 or significant new features
- "minor": Version X.Y.0 or new features without breaking changes
- "patch": Version X.Y.Z or bug fixes only
- "security": Contains security fixes, CVE mentions, vulnerability patches
- "breaking": Contains breaking changes regardless of version
- "unknown": Cannot determine`;

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
    });

    const responseText =
      typeof response === "object" && "response" in response
        ? (response as { response: string }).response
        : String(response);

    return parseAIResponse(responseText);
  } catch (error) {
    console.error("[AI] Failed to analyze release:", error);
    return null;
  }
}

function parseAIResponse(response: string): AIAnalysisResult | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI] No JSON found in response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.category !== "string"
    ) {
      console.error("[AI] Invalid response structure");
      return null;
    }

    const validCategories: ReleaseCategory[] = [
      "major",
      "minor",
      "patch",
      "security",
      "breaking",
      "unknown",
    ];
    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : "unknown";

    return {
      summary: parsed.summary.slice(0, 500),
      category,
      hasBreakingChanges: Boolean(parsed.hasBreakingChanges),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights
            .slice(0, 3)
            .map((h: unknown) => String(h).slice(0, 100))
        : [],
    };
  } catch (error) {
    console.error("[AI] Failed to parse response:", error);
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
