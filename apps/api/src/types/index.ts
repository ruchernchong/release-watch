import type { AIAnalysisResult } from "@release-watch/types";

// Re-export channel types from shared package
export type {
  ChannelConfig,
  ChannelType,
  DiscordChannelConfig,
  TelegramChannelConfig,
} from "@release-watch/types";

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

export type { AIAnalysisResult, ReleaseCategory } from "@release-watch/types";

// System-wide statistics
export interface SystemStats {
  uniqueUsers: number;
  reposWatched: number;
  reposTracked: number;
  notificationsSent: number;
  releasesNotified: number;
}
