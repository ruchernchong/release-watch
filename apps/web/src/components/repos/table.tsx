"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";

interface Repo {
  id: string;
  repoName: string;
  lastNotifiedTag: string | null;
  paused: boolean;
  createdAt: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createColumns(
  onRequestDelete: (repo: Repo) => void,
  onTogglePause: (repo: Repo) => void,
): ColumnDef<Repo>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "repoName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Repository
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const repoName = row.getValue("repoName") as string;
        return (
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {repoName}
            </a>
            <ExternalLink className="size-3 text-muted-foreground" />
          </div>
        );
      },
    },
    {
      accessorKey: "paused",
      header: "Status",
      cell: ({ row }) => {
        const isPaused = row.getValue("paused") as boolean;
        return isPaused ? (
          <Badge variant="secondary" className="gap-1">
            <Pause className="size-3" />
            Paused
          </Badge>
        ) : (
          <Badge variant="default" className="gap-1">
            <Play className="size-3" />
            Active
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastNotifiedTag",
      header: "Last Release",
      cell: ({ row }) => {
        const tag = row.getValue("lastNotifiedTag") as string | null;
        return tag ? (
          <Badge variant="secondary">{tag}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.getValue("createdAt"))}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const repo = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  window.open(`https://github.com/${repo.repoName}`, "_blank")
                }
              >
                <ExternalLink className="size-4" />
                View on GitHub
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePause(repo)}>
                {repo.paused ? (
                  <>
                    <Play className="size-4" />
                    Resume tracking
                  </>
                ) : (
                  <>
                    <Pause className="size-4" />
                    Pause tracking
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRequestDelete(repo)}
              >
                <Trash2 className="size-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function ReposTable() {
  const [repos, setRepos] = React.useState<Repo[]>([]);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [repoToDelete, setRepoToDelete] = React.useState<Repo | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const fetchRepos = React.useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const data = await api.get<{ repos: Repo[] }>("/repos");
        setRepos(data.repos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch repos");
      }
    });
  }, []);

  React.useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleDelete = React.useCallback(async (id: string) => {
    try {
      await api.delete(`/repos/${id}`);
      setRepos((previousRepos) =>
        previousRepos.filter((repo) => repo.id !== id),
      );
      setRepoToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete repo");
      setRepoToDelete(null);
    }
  }, []);

  const handleTogglePause = React.useCallback(async (repoToToggle: Repo) => {
    try {
      const updatedRepo = await api.patch<{ repo: Repo }>(
        `/repos/${repoToToggle.id}/pause`,
        { paused: !repoToToggle.paused },
      );
      setRepos((previousRepos) =>
        previousRepos.map((currentRepo) =>
          currentRepo.id === repoToToggle.id ? updatedRepo.repo : currentRepo,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update repo status",
      );
    }
  }, []);

  const columns = React.useMemo(
    () => createColumns(setRepoToDelete, handleTogglePause),
    [handleTogglePause],
  );

  const table = useReactTable({
    data: repos,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (isPending && repos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && repos.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchRepos}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Filter repositories..."
          value={
            (table.getColumn("repoName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("repoName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No repositories tracked yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2 py-4">
        <div className="flex-1 text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertDialog
        open={!!repoToDelete}
        onOpenChange={(open) => !open && setRepoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove repository?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop tracking{" "}
              <span className="font-medium text-foreground">
                {repoToDelete?.repoName}
              </span>{" "}
              and you will no longer receive notifications for new releases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => repoToDelete && handleDelete(repoToDelete.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
