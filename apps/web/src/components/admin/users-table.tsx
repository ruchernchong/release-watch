"use client";

import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  InputGroup,
  Label,
  Separator,
  Skeleton,
  TextField,
  Typography,
} from "@heroui/react";
import { DataGrid, type DataGridColumn, NumberValue } from "@heroui-pro/react";
import { BanUserDialog } from "@web/components/admin/ban-user-dialog";
import { api } from "@web/lib/api-client";
import {
  Ban,
  Check,
  Eye,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserX,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  type Key,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

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

function formatJoined(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UsersTable() {
  const router = useRouter();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

  const handleUnban = useCallback(
    async (userId: string) => {
      try {
        await api.post(`/admin/users/${userId}/ban`, { action: "unban" });
        fetchUsers(searchQuery);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unban user");
      }
    },
    [fetchUsers, searchQuery],
  );

  const handleRowAction = useCallback(
    (user: User, key: Key) => {
      if (key === "view") {
        router.push(`/dashboard/admin/users/${user.id}` as Route);
      } else if (key === "unban") {
        handleUnban(user.id);
      } else if (key === "ban") {
        setBanDialogUser(user);
      }
    },
    [router, handleUnban],
  );

  const columns: DataGridColumn<User>[] = [
    {
      id: "name",
      header: "User",
      accessorKey: "name",
      isRowHeader: true,
      allowsSorting: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {user.image && <Avatar.Image src={user.image} alt={user.name} />}
            <Avatar.Fallback>
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <Typography type="body-sm" weight="medium">
              {user.name}
            </Typography>
            <Typography type="body-xs" color="muted">
              {user.email}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: (user) =>
        user.role === "admin" ? (
          <Chip color="accent" variant="soft" size="sm">
            <ShieldCheck className="size-3" />
            <Chip.Label>Admin</Chip.Label>
          </Chip>
        ) : (
          <Chip variant="soft" size="sm">
            <Chip.Label>User</Chip.Label>
          </Chip>
        ),
    },
    {
      id: "banned",
      header: "Status",
      accessorKey: "banned",
      cell: (user) =>
        user.banned ? (
          <Chip color="danger" variant="soft" size="sm">
            <UserX className="size-3" />
            <Chip.Label>Banned</Chip.Label>
          </Chip>
        ) : (
          <Chip color="success" variant="soft" size="sm">
            <Check className="size-3" />
            <Chip.Label>Active</Chip.Label>
          </Chip>
        ),
    },
    {
      id: "createdAt",
      header: "Joined",
      accessorKey: "createdAt",
      allowsSorting: true,
      cell: (user) => (
        <Typography type="body-sm" color="muted">
          {formatJoined(user.createdAt)}
        </Typography>
      ),
    },
    {
      id: "repoCount",
      header: "Repos",
      accessorKey: "repoCount",
      allowsSorting: true,
      cell: (user) => <NumberValue value={user.repoCount} />,
    },
    {
      id: "actions",
      header: "",
      align: "end",
      cell: (user) => {
        const isAdmin = user.role === "admin";
        return (
          <Dropdown>
            <Button isIconOnly variant="ghost" size="sm" aria-label="Actions">
              <MoreHorizontal className="size-4" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu
                aria-label="User actions"
                onAction={(key) => handleRowAction(user, key)}
              >
                <Dropdown.Item id="view" textValue="View Details">
                  <Eye className="size-4 text-muted" />
                  <Label>View Details</Label>
                </Dropdown.Item>
                {!isAdmin && user.banned && (
                  <>
                    <Separator />
                    <Dropdown.Item id="unban" textValue="Unban User">
                      <Check className="size-4 text-muted" />
                      <Label>Unban User</Label>
                    </Dropdown.Item>
                  </>
                )}
                {!isAdmin && !user.banned && (
                  <>
                    <Separator />
                    <Dropdown.Item
                      id="ban"
                      textValue="Ban User"
                      variant="danger"
                    >
                      <Ban className="size-4 text-danger" />
                      <Label>Ban User</Label>
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        );
      },
    },
  ];

  if (!data && isPending) {
    return <UsersTableSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/10 px-4 py-3">
            <Typography type="body-sm" className="text-danger">
              {error}
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => fetchUsers(searchQuery)}
            >
              Retry
            </Button>
          </div>
        )}

        <TextField
          value={searchQuery}
          onChange={setSearchQuery}
          aria-label="Search users"
        >
          <InputGroup>
            <InputGroup.Prefix>
              <Search className="size-4 text-muted" />
            </InputGroup.Prefix>
            <InputGroup.Input placeholder="Search users..." />
          </InputGroup>
        </TextField>

        <DataGrid
          aria-label="Users"
          data={data?.users ?? []}
          columns={columns}
          getRowId={(user) => user.id}
          renderEmptyState={() => (
            <div className="flex flex-col items-center gap-2 py-8">
              <UserX className="size-8 text-muted" />
              <Typography color="muted">No users found.</Typography>
            </div>
          )}
        />

        <Typography type="body-sm" color="muted">
          {data?.total ?? 0} total users
        </Typography>
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
      <div className="flex flex-col gap-3">
        {["s0", "s1", "s2", "s3", "s4"].map((id) => (
          <div key={id} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
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
