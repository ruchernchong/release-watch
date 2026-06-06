"use client";

import {
  Avatar,
  Button,
  InputGroup,
  Label,
  Link,
  Modal,
  Skeleton,
  TextField,
  Typography,
} from "@heroui/react";
import { NumberValue } from "@heroui-pro/react";
import { createRepo } from "@web/app/(dashboard)/dashboard/repos/actions";
import type { GitHubLanguageColors, GitHubRepoResponse } from "@web/lib/github";
import { AlertCircle, GitFork, Github, Loader2, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function parseRepoInput(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/,
  );
  return match ? match[1] : null;
}

export function AddRepoDialog({ open, onOpenChange }: AddRepoDialogProps) {
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
        await createRepo(repoName);
        onOpenChange(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add repository",
        );
      }
    });
  };

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon>
              <Github className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Add Repository</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                value={repoInput}
                onChange={setRepoInput}
                isDisabled={isSubmitting}
                aria-label="Repository"
              >
                <Label>Repository</Label>
                <InputGroup>
                  <InputGroup.Input
                    ref={inputRef}
                    placeholder="owner/repo or GitHub URL"
                  />
                  {isFetching && (
                    <InputGroup.Suffix>
                      <Loader2 className="size-4 animate-spin text-muted" />
                    </InputGroup.Suffix>
                  )}
                </InputGroup>
              </TextField>

              {error && (
                <Typography type="body-sm" className="text-danger">
                  <AlertCircle className="inline size-4" /> {error}
                </Typography>
              )}

              {isFetching && !preview && (
                <div className="flex items-center gap-3 rounded-xl border border-separator p-4">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              )}

              {preview && !isFetching && (
                <div className="flex items-start gap-3 rounded-xl border border-separator p-4">
                  <Avatar>
                    <Avatar.Fallback>
                      <Github className="size-4" />
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Typography.Code>
                        {preview.owner}/{preview.name}
                      </Typography.Code>
                      <Link
                        href={preview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Link.Icon />
                      </Link>
                    </div>
                    {preview.description && (
                      <Typography type="body-xs" color="muted" truncate>
                        {preview.description}
                      </Typography>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      <Typography type="body-xs" color="muted">
                        <Star className="inline size-3 text-warning" />{" "}
                        <NumberValue value={preview.stars} notation="compact" />
                      </Typography>
                      <Typography type="body-xs" color="muted">
                        <GitFork className="inline size-3" />{" "}
                        <NumberValue value={preview.forks} notation="compact" />
                      </Typography>
                      {preview.language && (
                        <Typography type="body-xs" color="muted">
                          <span
                            className="mr-1 inline-block size-2 rounded-full align-middle"
                            style={{
                              backgroundColor:
                                preview.languageColor || "#6b7280",
                            }}
                          />
                          {preview.language}
                        </Typography>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                isDisabled={!preview || isFetching || isSubmitting}
                isPending={isSubmitting}
              >
                Add Repository
              </Button>
            </form>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
