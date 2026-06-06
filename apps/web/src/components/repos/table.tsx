"use client";

import {
  Button,
  Chip,
  Dropdown,
  InputGroup,
  Label,
  Link,
  Modal,
  Separator,
  TextField,
  Typography,
} from "@heroui/react";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react";
import {
  deleteRepo,
  toggleRepoPause,
} from "@web/app/(dashboard)/dashboard/repos/actions";
import {
  ExternalLink,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { type Key, useCallback, useMemo, useState } from "react";

/** Matches DataGrid's selection type (React Aria's `"all" | Set<Key>`). */
type Selection = "all" | Set<string | number>;

interface Repo {
  id: string;
  repoName: string;
  lastNotifiedTag: string | null;
  paused: boolean;
  createdAt: string;
}

interface ReposTableProps {
  initialRepos: Repo[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReposTable({ initialRepos }: ReposTableProps) {
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [error, setError] = useState<string | null>(null);
  const [repoToDelete, setRepoToDelete] = useState<Repo | null>(null);
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRepo(id);
      setRepos((previousRepos) =>
        previousRepos.filter((repo) => repo.id !== id),
      );
      setRepoToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete repo");
      setRepoToDelete(null);
    }
  }, []);

  const handleTogglePause = useCallback(async (repoToToggle: Repo) => {
    try {
      const result = await toggleRepoPause(
        repoToToggle.id,
        !repoToToggle.paused,
      );
      setRepos((previousRepos) =>
        previousRepos.map((currentRepo) =>
          currentRepo.id === repoToToggle.id ? result.repo : currentRepo,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update repo status",
      );
    }
  }, []);

  const handleRowAction = useCallback(
    (repo: Repo, key: Key) => {
      if (key === "github") {
        window.open(`https://github.com/${repo.repoName}`, "_blank");
      } else if (key === "pause") {
        handleTogglePause(repo);
      } else if (key === "delete") {
        setRepoToDelete(repo);
      }
    },
    [handleTogglePause],
  );

  const columns = useMemo<DataGridColumn<Repo>[]>(
    () => [
      {
        id: "repoName",
        header: "Repository",
        accessorKey: "repoName",
        isRowHeader: true,
        allowsSorting: true,
        cell: (repo) => (
          <Link
            href={`https://github.com/${repo.repoName}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {repo.repoName}
            <Link.Icon />
          </Link>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "paused",
        cell: (repo) => (
          <Chip
            color={repo.paused ? "default" : "success"}
            variant="soft"
            size="sm"
          >
            {repo.paused && <Pause className="size-3" />}
            {!repo.paused && <Play className="size-3" />}
            <Chip.Label>{repo.paused ? "Paused" : "Active"}</Chip.Label>
          </Chip>
        ),
      },
      {
        id: "lastRelease",
        header: "Last Release",
        accessorKey: "lastNotifiedTag",
        cell: (repo) =>
          repo.lastNotifiedTag ? (
            <Chip variant="soft" size="sm">
              <Chip.Label>{repo.lastNotifiedTag}</Chip.Label>
            </Chip>
          ) : (
            <Typography type="body-sm" color="muted">
              —
            </Typography>
          ),
      },
      {
        id: "createdAt",
        header: "Added",
        accessorKey: "createdAt",
        allowsSorting: true,
        cell: (repo) => (
          <Typography type="body-sm" color="muted">
            {formatDate(repo.createdAt)}
          </Typography>
        ),
      },
      {
        id: "actions",
        header: "",
        align: "end",
        cell: (repo) => (
          <Dropdown>
            <Button isIconOnly variant="ghost" size="sm" aria-label="Actions">
              <MoreHorizontal className="size-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                aria-label="Repository actions"
                onAction={(key) => handleRowAction(repo, key)}
              >
                <Dropdown.Item id="github" textValue="View on GitHub">
                  <ExternalLink className="size-4 text-muted" />
                  <Label>View on GitHub</Label>
                </Dropdown.Item>
                <Dropdown.Item id="pause" textValue="Toggle tracking">
                  {repo.paused && <Play className="size-4 text-muted" />}
                  {!repo.paused && <Pause className="size-4 text-muted" />}
                  <Label>
                    {repo.paused ? "Resume tracking" : "Pause tracking"}
                  </Label>
                </Dropdown.Item>
                <Separator />
                <Dropdown.Item id="delete" textValue="Remove" variant="danger">
                  <Trash2 className="size-4 text-danger" />
                  <Label>Remove</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        ),
      },
    ],
    [handleRowAction],
  );

  const filteredRepos = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return repos;
    return repos.filter((repo) =>
      repo.repoName.toLowerCase().includes(trimmed),
    );
  }, [repos, query]);

  const selectedCount =
    selectedKeys === "all" ? filteredRepos.length : selectedKeys.size;

  return (
    <div className="flex w-full flex-col gap-4">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/10 px-4 py-3">
          <Typography type="body-sm" className="text-danger">
            {error}
          </Typography>
          <Button variant="ghost" size="sm" onPress={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <TextField
        value={query}
        onChange={setQuery}
        aria-label="Filter repositories"
      >
        <InputGroup>
          <InputGroup.Input placeholder="Filter repositories..." />
        </InputGroup>
      </TextField>

      <DataGrid
        aria-label="Tracked repositories"
        data={filteredRepos}
        columns={columns}
        getRowId={(repo) => repo.id}
        selectionMode="multiple"
        showSelectionCheckboxes
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        renderEmptyState={() => (
          <Typography type="body-sm" color="muted">
            No repositories tracked yet.
          </Typography>
        )}
      />

      {selectedCount > 0 && (
        <Typography type="body-sm" color="muted">
          {selectedCount} of {filteredRepos.length} row(s) selected.
        </Typography>
      )}

      <Modal.Backdrop
        isOpen={!!repoToDelete}
        onOpenChange={(open) => !open && setRepoToDelete(null)}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Remove repository?</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Typography color="muted">
                This will stop tracking{" "}
                <Typography weight="medium">
                  {repoToDelete?.repoName}
                </Typography>{" "}
                and you will no longer receive notifications for new releases.
              </Typography>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={() => repoToDelete && handleDelete(repoToDelete.id)}
              >
                Remove
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
