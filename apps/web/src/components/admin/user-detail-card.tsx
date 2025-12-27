"use client";

import {
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  ExternalLink,
  FolderGit2,
  Mail,
  MessageSquare,
  Send,
  Shield,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { BanUserDialog } from "@/components/admin/ban-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";

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
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <Avatar className="size-16">
                <AvatarImage src={user.image ?? ""} alt={user.name} />
                <AvatarFallback className="text-xl">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-xl">{user.name}</h2>
                  {isAdmin && (
                    <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400">
                      <ShieldCheck className="mr-1 size-3" />
                      Admin
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" />
                  <span>{user.email}</span>
                  {user.emailVerified && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="mr-1 size-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="size-4" />
                  <span>
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Status */}
            <div className="flex flex-col gap-3">
              <h3 className="font-medium">Account Status</h3>
              {user.banned ? (
                <div className="flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center gap-2">
                    <UserX className="size-4 text-red-500" />
                    <span className="font-medium text-red-600 dark:text-red-400">
                      Banned
                    </span>
                  </div>
                  {user.banReason && (
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Reason:</span>{" "}
                      {user.banReason}
                    </p>
                  )}
                  {user.banExpires && (
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Expires:</span>{" "}
                      {new Date(user.banExpires).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <Check className="size-4 text-emerald-500" />
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Security */}
            <div className="flex flex-col gap-3">
              <h3 className="font-medium">Security</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-muted-foreground" />
                  <span className="text-sm">2FA</span>
                  {user.twoFactorEnabled ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isAdmin && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {user.banned ? (
                    <Button variant="outline" onClick={handleUnban}>
                      <Check className="size-4" />
                      Unban User
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => setShowBanDialog(true)}
                    >
                      <Ban className="size-4" />
                      Ban User
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {connectedAccounts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {connectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <ProviderIcon provider={account.providerId} />
                      <span className="text-sm capitalize">
                        {account.providerId}
                      </span>
                      <Check className="ml-auto size-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No connected accounts
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channels</CardTitle>
            </CardHeader>
            <CardContent>
              {channels.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <ChannelIcon type={channel.type} />
                      <span className="text-sm capitalize">{channel.type}</span>
                      {channel.enabled ? (
                        <Badge className="ml-auto bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-auto">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No notification channels
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tracked Repos */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="size-5" />
              Tracked Repos ({repos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repos.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {repos.map((sub) => (
                  <a
                    key={sub.id}
                    href={`https://github.com/${sub.repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <FolderGit2 className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium text-sm">
                      {sub.repoName}
                    </span>
                    {sub.lastNotifiedTag && (
                      <Badge variant="secondary" className="text-xs">
                        {sub.lastNotifiedTag}
                      </Badge>
                    )}
                    <ExternalLink className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FolderGit2 className="size-8 text-muted-foreground/50" />
                <p className="text-muted-foreground">No tracked repos yet</p>
              </div>
            )}
          </CardContent>
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
  switch (provider.toLowerCase()) {
    case "github":
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
    case "google":
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
    default:
      return <Shield className="size-4 text-muted-foreground" />;
  }
}

function ChannelIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case "telegram":
      return <Send className="size-4 text-blue-500" />;
    case "discord":
      return <MessageSquare className="size-4 text-indigo-500" />;
    default:
      return <AlertTriangle className="size-4 text-muted-foreground" />;
  }
}

function UserDetailCardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
