import type { AIAnalysisResult } from "@release-watch/types";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryBadge } from "./category-badge";

export interface Release {
  repoName: string;
  tagName: string;
  releaseName: string | null;
  url: string;
  publishedAt: string | null;
  author: string | null;
  aiAnalysis: AIAnalysisResult | null;
}

interface ReleaseCardProps {
  release: Release;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const timeAgo = release.publishedAt
    ? formatTimeAgo(release.publishedAt)
    : null;

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <a
            href={release.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 font-medium hover:underline"
          >
            <span>{release.repoName}</span>
            <ExternalLink className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <code className="font-mono text-muted-foreground text-sm">
            {release.tagName}
          </code>
        </div>
        {release.aiAnalysis && (
          <CategoryBadge category={release.aiAnalysis.category} />
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {release.aiAnalysis ? (
          <>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {release.aiAnalysis.summary}
            </p>
            {release.aiAnalysis.highlights.length > 0 && (
              <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
                {release.aiAnalysis.highlights.slice(0, 3).map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            No AI analysis available
          </p>
        )}
        {(timeAgo || release.author) && (
          <p className="text-muted-foreground text-xs">
            {timeAgo && <span>Published {timeAgo}</span>}
            {timeAgo && release.author && <span> by </span>}
            {release.author && (
              <span className="font-medium">{release.author}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}
