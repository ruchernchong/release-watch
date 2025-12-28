"use client";

import {
  AlertCircle,
  Check,
  ExternalLink,
  GitFork,
  Github,
  Loader2,
  Plus,
  Search,
  Star,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

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
    /(?:https?:\/\/)?(?:github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/
  );
  return match ? match[1] : null;
}

interface TrackedRepo {
  repoName: string;
}

export function RepoSearch() {
  const [repoInput, setRepoInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RepoPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTracked, setIsTracked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedReposRef = useRef<Set<string>>(new Set());

  const fetchTrackedRepos = useEffectEvent(async () => {
    try {
      const data = await api.get<{ repos: TrackedRepo[] }>("/repos");
      trackedReposRef.current = new Set(
        data.repos.map((repo) => repo.repoName.toLowerCase())
      );
    } catch {
      // Ignore errors
    }
  });

  useEffect(() => {
    fetchTrackedRepos();
  }, []);

  const fetchRepoPreview = useCallback((repoName: string) => {
    startTransition(async () => {
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
              "https://raw.githubusercontent.com/ozh/github-colors/master/colors.json"
            );
            if (colorsRes.ok) {
              const colors = await colorsRes.json();
              languageColor = colors[data.language]?.color || null;
            }
          } catch {
            // Ignore color fetch errors
          }
        }

        const repoFullName = `${data.owner.login}/${data.name}`.toLowerCase();
        setIsTracked(trackedReposRef.current.has(repoFullName));
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
        setOpen(true);
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
      setOpen(false);
      setIsTracked(false);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!preview || isSubmitting) return;

    const repoName = `${preview.owner}/${preview.name}`;
    setIsSubmitting(true);

    try {
      await api.post("/repos", { repoName });
      trackedReposRef.current.add(repoName.toLowerCase());
      setRepoInput("");
      setPreview(null);
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add repository"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && preview && !isPending && !isSubmitting && !isTracked) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search repos (owner/repo)"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            className={cn(
              "h-9 pl-9 pr-9 font-mono text-sm",
              error && repoInput && "border-destructive/50"
            )}
          />
          {isPending && (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {error && (
          <div className="flex items-center gap-2 border-b p-3 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isPending && !preview && (
          <div className="flex items-center gap-3 p-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        )}

        {preview && !isPending && (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
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
                    onClick={(e) => e.stopPropagation()}
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
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || isTracked}
              variant={isTracked ? "secondary" : "default"}
              className="w-full"
            >
              {isTracked ? (
                <>
                  <Check className="size-4" />
                  Tracked
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Add to watchlist
                </>
              )}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
