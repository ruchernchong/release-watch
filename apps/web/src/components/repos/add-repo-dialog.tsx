"use client";

import {
  AlertCircle,
  ExternalLink,
  GitFork,
  Github,
  Loader2,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { GitHubLanguageColors, GitHubRepoResponse } from "@/lib/github";

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddRepoDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddRepoDialogProps) {
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

        const data: GitHubRepoResponse = await res.json();

        let languageColor: string | null = null;
        if (data.language) {
          try {
            const colorsRes = await fetch(
              "https://raw.githubusercontent.com/ozh/github-colors/master/colors.json",
            );
            if (colorsRes.ok) {
              const colors: GitHubLanguageColors = await colorsRes.json();
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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setRepoInput("");
      setPreview(null);
      setError(null);
    }
  }, [open]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;

    const repoName = `${preview.owner}/${preview.name}`;

    startSubmitTransition(async () => {
      try {
        await api.post("/repos", { repoName });
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add repository",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
              <Github className="size-5" />
            </div>
            <div>
              <DialogTitle>Add Repository</DialogTitle>
              <DialogDescription>
                Watch a GitHub repository for new releases
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
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

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isFetching && !preview && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            </div>
          )}

          {preview && !isFetching && (
            <div className="fade-in slide-in-from-top-1 flex animate-in flex-col gap-3 rounded-xl border bg-muted/20 p-4 duration-150">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/50 ring-1 ring-border/50">
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
                    <p className="line-clamp-2 text-muted-foreground text-xs">
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

          <Button
            type="submit"
            disabled={!preview || isFetching || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Repository"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
