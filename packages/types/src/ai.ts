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
