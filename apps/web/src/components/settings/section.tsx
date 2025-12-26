"use client";

import {
  Bell,
  Download,
  Moon,
  Shield,
  Sun,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/lib/auth-client";

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center justify-between gap-6 rounded-lg px-4 py-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-all group-hover:bg-background group-hover:shadow-sm">
          <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="cursor-pointer font-medium">{label}</Label>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 px-4">
      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

export function SettingsSection() {
  const { data: session } = useSession();
  const user = session?.user;

  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [releaseNotifications, setReleaseNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [aiSummaries, setAiSummaries] = useState(true);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notification settings.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Profile Section */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <User className="size-5 text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Your personal information and account details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="size-20 ring-4 ring-muted">
                  <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                  <AvatarFallback className="font-semibold text-2xl">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="text-xs">
                  Change photo
                </Button>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    defaultValue={user?.name ?? ""}
                    placeholder="Your name"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email ?? ""}
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-muted-foreground text-xs">
                    Email cannot be changed. Contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button>Save changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/5">
                <Bell className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure how and when you receive updates.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-4">
            <SettingRow
              icon={Zap}
              label="Release notifications"
              description="Get notified immediately when a watched repo publishes a new release."
            >
              <Switch
                checked={releaseNotifications}
                onCheckedChange={setReleaseNotifications}
              />
            </SettingRow>
            <Separator />
            <SettingRow
              icon={Bell}
              label="Weekly digest"
              description="Receive a weekly summary of all releases from your watched repos."
            >
              <Switch
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </SettingRow>
            <Separator />
            <SettingRow
              icon={Zap}
              label="AI summaries"
              description="Include AI-generated summaries in release notifications."
            >
              <Switch checked={aiSummaries} onCheckedChange={setAiSummaries} />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/5">
                <Sun className="size-5 text-violet-600 dark:hidden dark:text-violet-400" />
                <Moon className="hidden size-5 text-violet-400 dark:block" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how ReleaseWatch looks on your device.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <Label>Theme preference</Label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setTheme("light");
                    document.documentElement.classList.remove("dark");
                  }}
                  className={`group flex flex-col items-center gap-4 rounded-xl border-2 p-4 transition-all hover:border-primary/50 ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50"
                  }`}
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 transition-transform group-hover:scale-110 dark:bg-amber-900/30">
                    <Sun className="size-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-medium text-sm">Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("dark");
                    document.documentElement.classList.add("dark");
                  }}
                  className={`group flex flex-col items-center gap-4 rounded-xl border-2 p-4 transition-all hover:border-primary/50 ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50"
                  }`}
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-800 transition-transform group-hover:scale-110 dark:bg-slate-700">
                    <Moon className="size-6 text-slate-300" />
                  </div>
                  <span className="font-medium text-sm">Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("system");
                    const prefersDark = window.matchMedia(
                      "(prefers-color-scheme: dark)",
                    ).matches;
                    document.documentElement.classList.toggle(
                      "dark",
                      prefersDark,
                    );
                  }}
                  className={`group flex flex-col items-center gap-4 rounded-xl border-2 p-4 transition-all hover:border-primary/50 ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50"
                  }`}
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted transition-transform group-hover:scale-110">
                    <Sun className="size-4 text-amber-600" />
                    <Moon className="size-4 text-slate-500 dark:text-slate-300" />
                  </div>
                  <span className="font-medium text-sm">System</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy Section */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/5">
                <Shield className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>
                  Manage your data and privacy preferences.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-6">
            <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Download className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <h4 className="font-medium">Export your data</h4>
                  <p className="text-muted-foreground text-sm">
                    Download a copy of your subscriptions and notification
                    history.
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <SectionHeader
                title="Danger zone"
                description="Irreversible actions that affect your account."
              />
              <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <Trash2 className="size-4 text-destructive" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <h4 className="font-medium">Delete account</h4>
                    <p className="text-muted-foreground text-sm">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
