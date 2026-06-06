"use client";

import {
  Avatar,
  Button,
  Card,
  Chip,
  Link,
  Separator,
  Skeleton,
  Typography,
} from "@heroui/react";
import { BanUserDialog } from "@web/components/admin/ban-user-dialog";
import { api } from "@web/lib/api-client";
import {
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  FolderGit2,
  Mail,
  MessageSquare,
  Send,
  Shield,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

interface UserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string | null;
    banned: boolean | null;
    banReason: string | null;
    banExpires: string | null;
    twoFactorEnabled: boolean | null;
    createdAt: string;
    updatedAt: string;
  };
  repos: {
    id: string;
    repoName: string;
    lastNotifiedTag: string | null;
    createdAt: string;
  }[];
  channels: {
    id: string;
    type: string;
    enabled: boolean;
    createdAt: string;
  }[];
  connectedAccounts: {
    id: string;
    providerId: string;
    createdAt: string;
  }[];
}

interface UserDetailCardProps {
  userId: string;
}

export function UserDetailCard({ userId }: UserDetailCardProps) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showBanDialog, setShowBanDialog] = useState(false);

  const fetchUser = useCallback(() => {
    startTransition(async () => {
      try {
        const responseData = await api.get<UserDetail>(
          `/admin/users/${userId}`,
        );
        setData(responseData);
      } catch {
        // Ignore
      }
    });
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUnban = async () => {
    try {
      await api.post(`/admin/users/${userId}/ban`, { action: "unban" });
      fetchUser();
    } catch {
      // Handle error
    }
  };

  if (isPending || !data) {
    return <UserDetailCardSkeleton />;
  }

  const { user, repos, channels, connectedAccounts } = data;
  const isAdmin = user.role === "admin";

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>Profile</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="flex items-start gap-4">
              <Avatar size="lg">
                {user.image && (
                  <Avatar.Image src={user.image} alt={user.name} />
                )}
                <Avatar.Fallback>
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Typography type="h6">{user.name}</Typography>
                  {isAdmin && (
                    <Chip color="accent" variant="soft" size="sm">
                      <ShieldCheck className="size-3" />
                      <Chip.Label>Admin</Chip.Label>
                    </Chip>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted" />
                  <Typography color="muted">{user.email}</Typography>
                  {user.emailVerified && (
                    <Chip color="success" variant="soft" size="sm">
                      <Check className="size-3" />
                      <Chip.Label>Verified</Chip.Label>
                    </Chip>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted" />
                  <Typography type="body-sm" color="muted">
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Status */}
            <div className="flex flex-col gap-3">
              <Typography type="body-sm" weight="medium">
                Account Status
              </Typography>
              {user.banned && (
                <div className="flex flex-col gap-2 rounded-lg border border-danger/20 bg-danger/5 p-4">
                  <Typography weight="medium" className="text-danger">
                    <UserX className="inline size-4" /> Banned
                  </Typography>
                  {user.banReason && (
                    <Typography type="body-sm" color="muted">
                      <Typography type="body-sm" weight="medium">
                        Reason:
                      </Typography>{" "}
                      {user.banReason}
                    </Typography>
                  )}
                  {user.banExpires && (
                    <Typography type="body-sm" color="muted">
                      <Typography type="body-sm" weight="medium">
                        Expires:
                      </Typography>{" "}
                      {new Date(user.banExpires).toLocaleString()}
                    </Typography>
                  )}
                </div>
              )}
              {!user.banned && (
                <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-4">
                  <Check className="size-4 text-success" />
                  <Typography weight="medium" className="text-success">
                    Active
                  </Typography>
                </div>
              )}
            </div>

            <Separator />

            {/* Security */}
            <div className="flex flex-col gap-3">
              <Typography type="body-sm" weight="medium">
                Security
              </Typography>
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted" />
                <Typography type="body-sm">2FA</Typography>
                {user.twoFactorEnabled && (
                  <Chip color="success" variant="soft" size="sm">
                    <Chip.Label>Enabled</Chip.Label>
                  </Chip>
                )}
                {!user.twoFactorEnabled && (
                  <Chip variant="soft" size="sm">
                    <Chip.Label>Disabled</Chip.Label>
                  </Chip>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isAdmin && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {user.banned && (
                    <Button variant="outline" onPress={handleUnban}>
                      <Check className="size-4" />
                      Unban User
                    </Button>
                  )}
                  {!user.banned && (
                    <Button
                      variant="danger"
                      onPress={() => setShowBanDialog(true)}
                    >
                      <Ban className="size-4" />
                      Ban User
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Connected Accounts */}
          <Card>
            <Card.Header>
              <Card.Title>Connected Accounts</Card.Title>
            </Card.Header>
            <Card.Content>
              {connectedAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {connectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-2 rounded-md border border-separator p-2"
                    >
                      <ProviderIcon provider={account.providerId} />
                      <Typography type="body-sm" className="capitalize">
                        {account.providerId}
                      </Typography>
                      <Check className="ml-auto size-4 text-success" />
                    </div>
                  ))}
                </div>
              )}
              {connectedAccounts.length === 0 && (
                <Typography type="body-sm" color="muted">
                  No connected accounts
                </Typography>
              )}
            </Card.Content>
          </Card>

          {/* Notification Channels */}
          <Card>
            <Card.Header>
              <Card.Title>Channels</Card.Title>
            </Card.Header>
            <Card.Content>
              {channels.length > 0 && (
                <div className="flex flex-col gap-2">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-2 rounded-md border border-separator p-2"
                    >
                      <ChannelIcon type={channel.type} />
                      <Typography type="body-sm" className="capitalize">
                        {channel.type}
                      </Typography>
                      {channel.enabled && (
                        <Chip
                          color="success"
                          variant="soft"
                          size="sm"
                          className="ml-auto"
                        >
                          <Chip.Label>Active</Chip.Label>
                        </Chip>
                      )}
                      {!channel.enabled && (
                        <Chip variant="soft" size="sm" className="ml-auto">
                          <Chip.Label>Disabled</Chip.Label>
                        </Chip>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {channels.length === 0 && (
                <Typography type="body-sm" color="muted">
                  No notification channels
                </Typography>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Tracked Repos */}
        <Card className="lg:col-span-3">
          <Card.Header>
            <Card.Title>
              <FolderGit2 className="inline size-5" /> Tracked Repos (
              {repos.length})
            </Card.Title>
          </Card.Header>
          <Card.Content>
            {repos.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {repos.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`https://github.com/${sub.repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-separator p-3"
                  >
                    <FolderGit2 className="size-4 text-muted" />
                    <Typography type="body-sm" weight="medium" truncate>
                      {sub.repoName}
                    </Typography>
                    {sub.lastNotifiedTag && (
                      <Chip variant="soft" size="sm" className="ml-auto">
                        <Chip.Label>{sub.lastNotifiedTag}</Chip.Label>
                      </Chip>
                    )}
                    <Link.Icon />
                  </Link>
                ))}
              </div>
            )}
            {repos.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FolderGit2 className="size-8 text-muted" />
                <Typography color="muted">No tracked repos yet</Typography>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {showBanDialog && (
        <BanUserDialog
          user={user}
          open={showBanDialog}
          onOpenChange={setShowBanDialog}
          onBanned={fetchUser}
        />
      )}
    </>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider.toLowerCase() === "github") {
    return (
      <svg
        className="size-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    );
  }
  if (provider.toLowerCase() === "google") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }
  return <Shield className="size-4 text-muted" />;
}

function ChannelIcon({ type }: { type: string }) {
  if (type.toLowerCase() === "telegram") {
    return <Send className="size-4 text-accent-foreground" />;
  }
  if (type.toLowerCase() === "discord") {
    return <MessageSquare className="size-4 text-accent-foreground" />;
  }
  return <AlertTriangle className="size-4 text-muted" />;
}

function UserDetailCardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <Card.Header>
          <Skeleton className="h-6 w-20" />
        </Card.Header>
        <Card.Content>
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </Card.Content>
      </Card>
      <div className="flex flex-col gap-6">
        <Card>
          <Card.Header>
            <Skeleton className="h-5 w-36" />
          </Card.Header>
          <Card.Content>
            <Skeleton className="h-20 w-full" />
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Skeleton className="h-5 w-20" />
          </Card.Header>
          <Card.Content>
            <Skeleton className="h-20 w-full" />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
