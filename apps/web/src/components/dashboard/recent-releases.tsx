"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { type Release, ReleaseCard } from "./release-card";

interface ReleasesResponse {
  releases: Release[];
}

export function RecentReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isPending, startTransition] = useTransition();

  const fetchReleases = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await api.get<ReleasesResponse>("/dashboard/releases");
        setReleases(data.releases || []);
      } catch {
        // Ignore errors
      }
    });
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Recent Releases</h2>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-4">
          <ReleaseCardSkeleton />
          <ReleaseCardSkeleton />
          <ReleaseCardSkeleton />
        </div>
      ) : releases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-muted-foreground">No releases yet</p>
            <p className="text-muted-foreground text-sm">
              Subscribe to repositories to see their latest releases here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {releases.map((release) => (
            <ReleaseCard
              key={`${release.repoName}-${release.tagName}`}
              release={release}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReleaseCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}
