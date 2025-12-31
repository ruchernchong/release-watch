"use client";

import {
  AlertCircle,
  ArrowLeft,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

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

interface TrackedRepo {
  repoName: string;
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

export function AddRepoForm({ onSuccess }: AddRepoFormProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RepoPreview[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedReposRef = useRef<Set<string>>(new Set());

  const fetchTrackedRepos = useEffectEvent(async () => {
    try {
      const data = await api.get<{ repos: TrackedRepo[] }>("/repos");
      trackedReposRef.current = new Set(
        data.repos.map((repo) => repo.repoName.toLowerCase()),
      );
    } catch {
      // Ignore errors
    }
  });

  useEffect(() => {
    fetchTrackedRepos();
  }, []);

  const searchRepos = useCallback((searchQuery: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=7`,
          { headers: { Accept: "application/vnd.github.v3+json" } },
        );

        if (!res.ok) {
          if (res.status === 403) {
            setError("Rate limited. Try again shortly.");
          } else {
            setError("Search failed");
          }
          setResults([]);
          return;
        }

        interface GitHubSearchItem {
          name: string;
          owner: { login: string };
          description: string | null;
          stargazers_count: number;
          forks_count: number;
          language: string | null;
          html_url: string;
        }

        const data: { items: GitHubSearchItem[] } = await res.json();

        if (data.items.length === 0) {
          setError("No repositories found");
          setResults([]);
          return;
        }

        const repos: RepoPreview[] = data.items.map((item) => ({
          name: item.name,
          owner: item.owner.login,
          description: item.description,
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language,
          languageColor: null,
          url: item.html_url,
        }));

        setResults(repos);
        setError(null);
        setOpen(true);
      } catch {
        setError("Network error");
        setResults([]);
      }
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setResults([]);
      setSelectedRepo(null);
      setOpen(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchRepos(trimmedQuery);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchRepos]);

  const handleSubmit = () => {
    if (!selectedRepo || isSubmitting) return;

    const repoName = `${selectedRepo.owner}/${selectedRepo.name}`;

    startSubmitTransition(async () => {
      try {
        await api.post("/repos", { repoName });
        trackedReposRef.current.add(repoName.toLowerCase());
        setQuery("");
        setResults([]);
        setSelectedRepo(null);
        setError(null);
        setOpen(false);
        onSuccess?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add repository",
        );
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (selectedRepo) {
        setSelectedRepo(null);
      } else {
        setOpen(false);
      }
    }
  };

  const isRepoTracked = (repo: RepoPreview) =>
    trackedReposRef.current.has(`${repo.owner}/${repo.name}`.toLowerCase());

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
              Search and watch a GitHub repository for new releases
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search repositories..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedRepo(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                className={cn(
                  "pr-9 pl-9 font-mono text-sm",
                  error && query && "border-destructive/50",
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
            {error && !selectedRepo && (
              <div className="flex items-center gap-2 border-b p-3 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading skeleton */}
            {isPending && !selectedRepo && results.length === 0 && (
              <div className="flex flex-col gap-1 p-2">
                {["skeleton-1", "skeleton-2", "skeleton-3"].map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 px-2 py-1.5"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="ml-auto h-4 w-12" />
                  </div>
                ))}
              </div>
            )}

            {/* Results list */}
            {!selectedRepo && results.length > 0 && (
              <div className="max-h-80 overflow-y-auto p-1">
                {results.map((repo) => {
                  const tracked = isRepoTracked(repo);
                  return (
                    <button
                      key={`${repo.owner}/${repo.name}`}
                      type="button"
                      onClick={() => setSelectedRepo(repo)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        tracked && "opacity-60",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono">
                        {repo.owner}/{repo.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 text-amber-500" />
                          <span>{formatNumber(repo.stars)}</span>
                        </div>
                        {tracked && <Check className="size-3 text-green-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected repo preview */}
            {selectedRepo && (
              <div className="flex flex-col gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3" />
                  Back to results
                </button>
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
                    <Github className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium font-mono text-sm">
                        {selectedRepo.owner}/{selectedRepo.name}
                      </span>
                      <a
                        href={selectedRepo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                    {selectedRepo.description && (
                      <p className="line-clamp-2 text-muted-foreground text-xs">
                        {selectedRepo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-1 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="size-3 text-amber-500" />
                        <span>{formatNumber(selectedRepo.stars)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitFork className="size-3" />
                        <span>{formatNumber(selectedRepo.forks)}</span>
                      </div>
                      {selectedRepo.language && (
                        <div className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-muted-foreground" />
                          <span>{selectedRepo.language}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isRepoTracked(selectedRepo)}
                  variant={
                    isRepoTracked(selectedRepo) ? "secondary" : "default"
                  }
                  className="w-full"
                >
                  {isRepoTracked(selectedRepo) ? (
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
      </CardContent>
    </Card>
  );
}
