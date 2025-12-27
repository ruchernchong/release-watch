"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Activity,
  Chrome,
  Globe,
  Laptop,
  Loader2,
  Monitor,
  Smartphone,
  UserCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ActivityLog {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  impersonatedBy: string | null;
}

interface ActivityResponse {
  activity: ActivityLog[];
  limit: number;
  offset: number;
}

function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
} {
  if (!ua)
    return { browser: "Unknown", os: "Unknown", device: "desktop" as const };

  let browser = "Unknown";
  let os = "Unknown";
  let device: "desktop" | "mobile" | "tablet" = "desktop";

  // Browser detection
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  // OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad"))
    os = "iOS";

  // Device detection
  if (ua.includes("Mobile") || ua.includes("Android")) device = "mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "tablet";

  return { browser, os, device };
}

function DeviceIcon({ device }: { device: "desktop" | "mobile" | "tablet" }) {
  switch (device) {
    case "mobile":
      return <Smartphone className="size-4" />;
    case "tablet":
      return <Laptop className="size-4" />;
    default:
      return <Monitor className="size-4" />;
  }
}

function BrowserIcon({ browser }: { browser: string }) {
  switch (browser.toLowerCase()) {
    case "chrome":
      return <Chrome className="size-4" />;
    default:
      return <Globe className="size-4" />;
  }
}

export function ActivityTable() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(0);

  const fetchActivity = useCallback((offset: number) => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          limit: "20",
          offset: String(offset),
        });

        const res = await fetch(`/api/admin/activity?${params}`);
        if (res.ok) {
          const responseData = await res.json();
          setData(responseData);
        }
      } catch {
        // Ignore
      }
    });
  }, []);

  useEffect(() => {
    fetchActivity(page * 20);
  }, [fetchActivity, page]);

  const columns: ColumnDef<ActivityLog>[] = [
    {
      accessorKey: "userName",
      header: "User",
      cell: ({ row }) => {
        const log = row.original;
        return (
          <Link
            href={`/dashboard/admin/users/${log.userId}` as Route}
            className="flex items-center gap-3 hover:underline"
          >
            <Avatar className="size-8">
              <AvatarImage src={log.userImage ?? ""} alt={log.userName ?? ""} />
              <AvatarFallback className="text-xs">
                {log.userName?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                {log.userName ?? "Unknown"}
              </span>
              <span className="text-muted-foreground text-xs">
                {log.userEmail}
              </span>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }) => {
        const ip = row.getValue("ipAddress") as string | null;
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {ip ?? "—"}
          </code>
        );
      },
    },
    {
      accessorKey: "userAgent",
      header: "Client",
      cell: ({ row }) => {
        const ua = row.getValue("userAgent") as string | null;
        const { browser, os, device } = parseUserAgent(ua);

        return (
          <div className="flex items-center gap-2">
            <DeviceIcon device={device} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{browser}</span>
              <span className="text-muted-foreground text-xs">{os}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Session Started",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-muted-foreground text-xs">
              {date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "impersonatedBy",
      header: "Status",
      cell: ({ row }) => {
        const impersonatedBy = row.getValue("impersonatedBy") as string | null;
        const expiresAt = new Date(row.original.expiresAt);
        const isExpired = expiresAt < new Date();

        if (impersonatedBy) {
          return (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <UserCircle className="mr-1 size-3" />
              Impersonated
            </Badge>
          );
        }

        if (isExpired) {
          return <Badge variant="secondary">Expired</Badge>;
        }

        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            Active
          </Badge>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.activity ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!data && isPending) {
    return <ActivityTableSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Recent session activity
          </span>
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
                    <Activity className="size-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No activity found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={(data?.activity.length ?? 0) < 20}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function ActivityTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-40" />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Session Started</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
