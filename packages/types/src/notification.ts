import type { AIAnalysisResult } from "./ai";
import type { ISODateString } from "./channel";

export interface NotificationPayload {
  repoName: string;
  tagName: string;
  releaseName: string | null;
  body: string | null;
  url: string;
  author: string | null;
  publishedAt: ISODateString;
  aiAnalysis: AIAnalysisResult | null;
}
