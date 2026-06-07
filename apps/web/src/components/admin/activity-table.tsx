"use client";

import {
  Avatar,
  Button,
  Chip,
  Link,
  Skeleton,
  Typography,
} from "@heroui/react";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react";
import { adminActivitySearchParams } from "@web/app/(dashboard)/dashboard/admin/activity/search-params";
import type { ActivityLog, AdminActivityResult } from "@web/lib/data/admin";
import {
  Activity,
  Laptop,
  Monitor,
  Smartphone,
  UserCircle,
} from "lucide-react";
import type { Route } from "next";
import { useQueryState } from "nuqs";
import { useTransition } from "react";

interface ActivityTableProps {
  data: AdminActivityResult;
}

function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
} {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "desktop" };

  let browser = "Unknown";
  let os = "Unknown";
  let device: "desktop" | "mobile" | "tablet" = "desktop";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad"))
    os = "iOS";

  if (ua.includes("Mobile") || ua.includes("Android")) device = "mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "tablet";

  return { browser, os, device };
}

function DeviceIcon({ device }: { device: "desktop" | "mobile" | "tablet" }) {
  if (device === "mobile") return <Smartphone className="size-4" />;
  if (device === "tablet") return <Laptop className="size-4" />;
  return <Monitor className="size-4" />;
}

export function ActivityTable({ data }: ActivityTableProps) {
  const [isPending, startTransition] = useTransition();
  const [, setOffset] = useQueryState(
    "offset",
    adminActivitySearchParams.offset.withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const navigateToOffset = (offset: number) => {
    const normalizedOffset = Math.max(0, offset);
    setOffset(normalizedOffset || null);
  };

  const columns: DataGridColumn<ActivityLog>[] = [
    {
      id: "userName",
      header: "User",
      accessorKey: "userName",
      isRowHeader: true,
      cell: (log) => (
        <Link
          href={`/dashboard/admin/users/${log.userId}` as Route}
          className="flex items-center gap-3"
        >
          <Avatar size="sm">
            {log.userImage && (
              <Avatar.Image src={log.userImage} alt={log.userName ?? ""} />
            )}
            <Avatar.Fallback>
              {log.userName?.charAt(0).toUpperCase() ?? "U"}
            </Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col">
            <Typography type="body-sm" weight="medium">
              {log.userName ?? "Unknown"}
            </Typography>
            <Typography type="body-xs" color="muted">
              {log.userEmail}
            </Typography>
          </div>
        </Link>
      ),
    },
    {
      id: "ipAddress",
      header: "IP Address",
      accessorKey: "ipAddress",
      cell: (log) => <Typography.Code>{log.ipAddress ?? "—"}</Typography.Code>,
    },
    {
      id: "userAgent",
      header: "Client",
      accessorKey: "userAgent",
      cell: (log) => {
        const { browser, os, device } = parseUserAgent(log.userAgent);
        return (
          <div className="flex items-center gap-2">
            <DeviceIcon device={device} />
            <div className="flex flex-col gap-0.5">
              <Typography type="body-sm">{browser}</Typography>
              <Typography type="body-xs" color="muted">
                {os}
              </Typography>
            </div>
          </div>
        );
      },
    },
    {
      id: "createdAt",
      header: "Session Started",
      accessorKey: "createdAt",
      allowsSorting: true,
      cell: (log) => {
        const date = new Date(log.createdAt);
        return (
          <div className="flex flex-col gap-0.5">
            <Typography type="body-sm">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Typography>
            <Typography type="body-xs" color="muted">
              {date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </div>
        );
      },
    },
    {
      id: "impersonatedBy",
      header: "Status",
      accessorKey: "impersonatedBy",
      cell: (log) => {
        const isExpired = new Date(log.expiresAt) < new Date();
        if (log.impersonatedBy) {
          return (
            <Chip color="warning" variant="soft" size="sm">
              <UserCircle className="size-3" />
              <Chip.Label>Impersonated</Chip.Label>
            </Chip>
          );
        }
        if (isExpired) {
          return (
            <Chip variant="soft" size="sm">
              <Chip.Label>Expired</Chip.Label>
            </Chip>
          );
        }
        return (
          <Chip color="success" variant="soft" size="sm">
            <Chip.Label>Active</Chip.Label>
          </Chip>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-muted" />
        <Typography type="body-sm" color="muted">
          Recent session activity
        </Typography>
      </div>

      <DataGrid
        aria-label="Session activity"
        data={data.activity}
        columns={columns}
        getRowId={(log) => log.id}
        renderEmptyState={() => (
          <div className="flex flex-col items-center gap-2 py-8">
            <Activity className="size-8 text-muted" />
            <Typography color="muted">No activity found.</Typography>
          </div>
        )}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={() => navigateToOffset(data.offset - data.limit)}
          isDisabled={data.offset === 0 || isPending}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => navigateToOffset(data.offset + data.limit)}
          isDisabled={data.activity.length < data.limit || isPending}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function ActivityTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-col gap-3">
        {["s0", "s1", "s2", "s3", "s4"].map((id) => (
          <div key={id} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
