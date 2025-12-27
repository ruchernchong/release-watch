"use client";

import {
  AlertCircle,
  ExternalLink,
  GitFork,
  Github,
  Loader2,
  Plus,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";

interface AddRepoFormProps {
  onSuccess?: () => void;
}

interface RepoPreview {
  name: string;
  owner: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
  url: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function parseRepoInput(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/,
  );
  return match ? match[1] : null;
}

export function AddRepoForm({ onSuccess }: AddRepoFormProps) {
  const [repoInput, setRepoInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RepoPreview | null>(null);
  const [isFetching, startFetchTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRepoPreview = useCallback((repoName: string) => {
    startFetchTransition(async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repoName}`, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError("Repository not found");
          } else if (res.status === 403) {
            setError("Rate limited. Try again shortly.");
          } else {
            setError("Failed to fetch repository");
          }
          setPreview(null);
          return;
        }

        const data = await res.json();

        let languageColor: string | null = null;
        if (data.language) {
          try {
            const colorsRes = await fetch(
              "https://raw.githubusercontent.com/ozh/github-colors/master/colors.json",
            );
            if (colorsRes.ok) {
              const colors = await colorsRes.json();
              languageColor = colors[data.language]?.color || null;
            }
          } catch {
            // Ignore color fetch errors
          }
        }

        setPreview({
          name: data.name,
          owner: data.owner.login,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          language: data.language,
          languageColor,
          url: data.html_url,
        });
        setError(null);
      } catch {
        setError("Network error");
        setPreview(null);
      }
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const repoName = parseRepoInput(repoInput);
    if (!repoName) {
      setPreview(null);
      if (repoInput.trim() && !repoInput.includes("/")) {
        setError("Use owner/repo format");
      } else {
        setError(null);
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchRepoPreview(repoName);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [repoInput, fetchRepoPreview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;

    const repoName = `${preview.owner}/${preview.name}`;

    startSubmitTransition(async () => {
      try {
        await api.post("/subscriptions", { repoName });
        setRepoInput("");
        setPreview(null);
        setError(null);
        onSuccess?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add repository",
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-md border bg-muted/50 p-2">
            <Github className="size-4 text-foreground" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">Add Repository</CardTitle>
            <CardDescription className="text-xs">
              Watch a GitHub repository for new releases
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="owner/repo or GitHub URL"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                disabled={isSubmitting}
                className="pr-9 font-mono text-sm"
              />
              {isFetching && (
                <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              type="submit"
              disabled={!preview || isFetching || isSubmitting}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isFetching && !preview && (
            <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            </div>
          )}

          {preview && !isFetching && (
            <div className="fade-in slide-in-from-top-1 flex animate-in flex-col gap-3 rounded-md border bg-muted/20 p-3 duration-150">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
                  <Github className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium font-mono text-sm">
                      {preview.owner}/{preview.name}
                    </span>
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  {preview.description && (
                    <p className="line-clamp-1 text-muted-foreground text-xs">
                      {preview.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-1 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-amber-500" />
                      <span>{formatNumber(preview.stars)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="size-3" />
                      <span>{formatNumber(preview.forks)}</span>
                    </div>
                    {preview.language && (
                      <div className="flex items-center gap-1">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: preview.languageColor || "#6b7280",
                          }}
                        />
                        <span>{preview.language}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
