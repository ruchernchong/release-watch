"use client";

import { ExternalLink, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function IntegrationsSection() {
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
              Start a conversation with our bot to connect your Telegram
              account.
            </p>
            <Button asChild className="w-fit">
              <a
                href="https://t.me/ReleaseWatch_Bot"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Open Telegram Bot
              </a>
            </Button>
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
