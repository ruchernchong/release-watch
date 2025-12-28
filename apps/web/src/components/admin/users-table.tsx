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
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Ban,
  Check,
  Eye,
  Loader2,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserX,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { BanUserDialog } from "@/components/admin/ban-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  repoCount: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

export function UsersTable() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [banDialogUser, setBanDialogUser] = useState<User | null>(null);

  const fetchUsers = useCallback((search = "") => {
    startTransition(async () => {
      try {
        setError(null);
        const params = new URLSearchParams({ limit: "20", offset: "0" });
        if (search) params.set("search", search);

        const responseData = await api.get<UsersResponse>(
          `/admin/users?${params}`,
        );
        setData(responseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      }
    });
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchUsers]);

  const handleUnban = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/ban`, { action: "unban" });
      fetchUsers(searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unban user");
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={user.image ?? ""} alt={user.name} />
              <AvatarFallback className="text-xs">
                {user.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{user.name}</span>
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string | null;
        return role === "admin" ? (
          <Badge className="bg-purple-500/15 text-purple-600 hover:bg-purple-500/20 dark:text-purple-400">
            <ShieldCheck className="mr-1 size-3" />
            Admin
          </Badge>
        ) : (
          <Badge variant="secondary">User</Badge>
        );
      },
    },
    {
      accessorKey: "banned",
      header: "Status",
      cell: ({ row }) => {
        const banned = row.getValue("banned") as boolean | null;
        return banned ? (
          <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 dark:text-red-400">
            <UserX className="mr-1 size-3" />
            Banned
          </Badge>
        ) : (
          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400">
            <Check className="mr-1 size-3" />
            Active
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Joined
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <span className="text-muted-foreground text-sm">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      accessorKey: "repoCount",
      header: "Repos",
      cell: ({ row }) => {
        const count = row.getValue("repoCount") as number;
        return <span className="font-mono text-sm">{count}</span>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        const isAdmin = user.role === "admin";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/admin/users/${user.id}` as Route}>
                  <Eye className="size-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {!isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  {user.banned ? (
                    <DropdownMenuItem onClick={() => handleUnban(user.id)}>
                      <Check className="size-4" />
                      Unban User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setBanDialogUser(user)}
                    >
                      <Ban className="size-4" />
                      Ban User
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.users ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (!data && isPending) {
    return <UsersTableSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchUsers(searchQuery)}
            >
              Retry
            </Button>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="overflow-hidden rounded-lg border">
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
                  <TableRow key={row.id}>
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
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <UserX className="size-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No users found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {data?.total ?? 0} total users
          </p>
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

      {banDialogUser && (
        <BanUserDialog
          user={banDialogUser}
          open={!!banDialogUser}
          onOpenChange={(open) => !open && setBanDialogUser(null)}
          onBanned={() => fetchUsers(searchQuery)}
        />
      )}
    </>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-72" />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Repos</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {["s0", "s1", "s2", "s3", "s4"].map((id) => (
              <TableRow key={id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="size-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
