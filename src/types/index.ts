// Notification payload
export interface NotificationPayload {
  repoName: string;
  tagName: string;
  releaseName: string | null;
  body: string | null;
  url: string;
  author: string | null;
  publishedAt: string;
}

// System-wide statistics
export interface SystemStats {
  uniqueUsers: number;
  reposWatched: number;
  totalSubscriptions: number;
  notificationsSent: number;
  releasesNotified: number;
}
