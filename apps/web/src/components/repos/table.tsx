"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  GitFork,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
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

interface Repo {
  id: string;
  name: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  latestRelease: string | null;
  lastChecked: string;
  language: string;
}

const MOCK_REPOS: Repo[] = [
  {
    id: "1",
    name: "react",
    owner: "facebook",
    description: "The library for web and native user interfaces.",
    stars: 231000,
    forks: 47200,
    latestRelease: "v19.0.0",
    lastChecked: "2 hours ago",
    language: "JavaScript",
  },
  {
    id: "2",
    name: "next.js",
    owner: "vercel",
    description: "The React Framework for the Web.",
    stars: 128000,
    forks: 27400,
    latestRelease: "v15.1.0",
    lastChecked: "1 hour ago",
    language: "TypeScript",
  },
  {
    id: "3",
    name: "typescript",
    owner: "microsoft",
    description:
      "TypeScript is a superset of JavaScript that compiles to clean JavaScript output.",
    stars: 102000,
    forks: 12500,
    latestRelease: "v5.7.2",
    lastChecked: "30 minutes ago",
    language: "TypeScript",
  },
  {
    id: "4",
    name: "tailwindcss",
    owner: "tailwindlabs",
    description: "A utility-first CSS framework for rapid UI development.",
    stars: 84000,
    forks: 4200,
    latestRelease: "v4.0.0",
    lastChecked: "45 minutes ago",
    language: "CSS",
  },
  {
    id: "5",
    name: "bun",
    owner: "oven-sh",
    description:
      "Incredibly fast JavaScript runtime, bundler, test runner, and package manager.",
    stars: 75000,
    forks: 2800,
    latestRelease: "v1.1.42",
    lastChecked: "15 minutes ago",
    language: "Zig",
  },
];

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: "bg-yellow-400",
    TypeScript: "bg-blue-500",
    CSS: "bg-purple-500",
    Zig: "bg-orange-500",
  };
  return colors[language] || "bg-gray-400";
}

const columns: ColumnDef<Repo>[] = [
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
    accessorKey: "name",
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
      const repo = row.original;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${repo.owner}/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {repo.owner}/{repo.name}
            </a>
            <ExternalLink className="size-3 text-muted-foreground" />
          </div>
          <p className="max-w-md truncate text-muted-foreground text-xs">
            {repo.description}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={`size-2.5 rounded-full ${getLanguageColor(repo.language)}`}
            />
            <span className="text-muted-foreground text-xs">
              {repo.language}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "latestRelease",
    header: "Latest Release",
    cell: ({ row }) => {
      const release = row.getValue("latestRelease") as string | null;
      return release ? (
        <Badge variant="secondary">{release}</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "stars",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stars
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Star className="size-3.5 text-muted-foreground" />
        <span>{formatNumber(row.getValue("stars"))}</span>
      </div>
    ),
  },
  {
    accessorKey: "forks",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Forks
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <GitFork className="size-3.5 text-muted-foreground" />
        <span>{formatNumber(row.getValue("forks"))}</span>
      </div>
    ),
  },
  {
    accessorKey: "lastChecked",
    header: "Last Checked",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.getValue("lastChecked")}
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
                window.open(
                  `https://github.com/${repo.owner}/${repo.name}`,
                  "_blank",
                )
              }
            >
              <ExternalLink className="size-4" />
              View on GitHub
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="size-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function ReposTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: MOCK_REPOS,
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Filter repositories..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
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
                  No results.
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
    </div>
  );
}
