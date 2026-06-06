"use client";

import {
  Collection,
  ComboBox,
  Description,
  Input,
  Label,
  ListBox,
  Typography,
} from "@heroui/react";
import { NumberValue } from "@heroui-pro/react";
import { api } from "@web/lib/api-client";
import {
  type Key,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

interface RepoPreview {
  id: string;
  name: string;
  owner: string;
  stars: number;
}

interface TrackedRepo {
  repoName: string;
}

export function RepoSearch() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RepoPreview[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
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
          setError(
            res.status === 403
              ? "Rate limited. Try again shortly."
              : "Search failed",
          );
          setResults([]);
          return;
        }

        interface GitHubSearchItem {
          name: string;
          owner: { login: string };
          stargazers_count: number;
        }

        const data: { items: GitHubSearchItem[] } = await res.json();
        setResults(
          data.items.map((item) => ({
            id: `${item.owner.login}/${item.name}`,
            name: item.name,
            owner: item.owner.login,
            stars: item.stargazers_count,
          })),
        );
        setError(data.items.length === 0 ? "No repositories found" : null);
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
    if (trimmedQuery.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => searchRepos(trimmedQuery), 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchRepos]);

  const handleSelect = (key: Key | null) => {
    if (key === null) return;
    const repoName = String(key);
    if (trackedReposRef.current.has(repoName.toLowerCase())) return;

    startSubmitting(async () => {
      try {
        await api.post("/repos", { repoName });
        trackedReposRef.current.add(repoName.toLowerCase());
        setQuery("");
        setResults([]);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add repository",
        );
      }
    });
  };

  return (
    <ComboBox
      aria-label="Search repositories"
      items={results}
      inputValue={query}
      onInputChange={setQuery}
      onSelectionChange={handleSelect}
      isDisabled={isSubmitting}
      allowsEmptyCollection
    >
      <ComboBox.InputGroup>
        <Input placeholder="Search repositories..." />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox
          aria-label="Repository results"
          renderEmptyState={() => (
            <Typography type="body-sm" color="muted">
              {isPending
                ? "Searching…"
                : (error ?? "Type at least 2 characters to search")}
            </Typography>
          )}
        >
          <Collection items={results}>
            {(repo: RepoPreview) => (
              <ListBox.Item id={repo.id} textValue={repo.id}>
                <Label>{repo.id}</Label>
                <Description>
                  <NumberValue value={repo.stars} notation="compact" /> stars
                </Description>
              </ListBox.Item>
            )}
          </Collection>
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
