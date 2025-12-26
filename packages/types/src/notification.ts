import type { AIAnalysisResult } from "./ai";

export interface NotificationPayload {
  repoName: string;
  tagName: string;
  releaseName: string | null;
  body: string | null;
  url: string;
  author: string | null;
  publishedAt: string;
  aiAnalysis?: AIAnalysisResult | null;
}
