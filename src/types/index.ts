import type { AIAnalysisResult } from "../services/ai.service";

// Notification payload
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

export type { AIAnalysisResult, ReleaseCategory } from "../services/ai.service";

// System-wide statistics
export interface SystemStats {
  uniqueUsers: number;
  reposWatched: number;
  totalSubscriptions: number;
  notificationsSent: number;
  releasesNotified: number;
}
