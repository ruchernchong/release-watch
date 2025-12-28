"use client";

import {
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { api } from "@/lib/api-client";
import { TelegramLinkDialog } from "./telegram-link-dialog";

interface TelegramStatusResponse {
  linked: boolean;
}

export function IntegrationsSection() {
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { isSupported, permission, requestPermission } = useNotifications();

  const fetchTelegramStatus = useCallback(() => {
    startTransition(async () => {
      try {
        setTelegramError(null);
        const data = await api.get<TelegramStatusResponse>(
          "/integrations/telegram/status",
        );
        setTelegramLinked(data.linked);
      } catch (err) {
        setTelegramError(
          err instanceof Error ? err.message : "Failed to check status",
        );
      }
    });
  }, []);

  useEffect(() => {
    fetchTelegramStatus();
  }, [fetchTelegramStatus]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your notification channels to receive release updates.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0088cc]">
                <Send className="size-5 text-white" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <CardTitle>Telegram</CardTitle>
                <CardDescription>
                  Receive notifications via Telegram bot.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Link your Telegram account to receive release notifications
              directly in your chat.
            </p>
            {isPending ? (
              <Button disabled className="w-fit">
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </Button>
            ) : telegramError ? (
              <div className="flex items-center gap-2">
                <span className="text-destructive text-sm">
                  {telegramError}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTelegramStatus}
                >
                  Retry
                </Button>
              </div>
            ) : telegramLinked ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-green-600 text-sm dark:text-green-400">
                  <Check className="size-4" />
                  Connected
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://t.me/ReleaseWatch_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open Bot
                  </a>
                </Button>
              </div>
            ) : (
              <>
                <Button onClick={() => setDialogOpen(true)} className="w-fit">
                  <Send className="size-4" />
                  Link Telegram
                </Button>
                <TelegramLinkDialog
                  open={dialogOpen}
                  onOpenChange={setDialogOpen}
                  onSuccess={fetchTelegramStatus}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                <Bell className="size-5 text-white" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <CardTitle>Browser Notifications</CardTitle>
                <CardDescription>
                  Get notified directly in your browser.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Receive instant notifications in your browser when new releases
              are detected.
            </p>
            {!isSupported ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <BellOff className="size-4" />
                Your browser doesn&apos;t support notifications
              </div>
            ) : permission === "granted" ? (
              <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-green-600 text-sm dark:text-green-400">
                <Check className="size-4" />
                Enabled
              </div>
            ) : permission === "denied" ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <BellOff className="size-4" />
                Notifications blocked. Enable in browser settings.
              </div>
            ) : (
              <Button onClick={requestPermission} className="w-fit">
                <Bell className="size-4" />
                Enable Notifications
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#5865F2]">
                <MessageCircle className="size-5 text-white" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle>Discord</CardTitle>
                  <span className="rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground text-xs">
                    Coming Soon
                  </span>
                </div>
                <CardDescription>
                  Get notified in your Discord server.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Add our bot to your Discord server to receive release
              notifications in any channel.
            </p>
            <Button disabled className="w-fit">
              Connect Discord
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
