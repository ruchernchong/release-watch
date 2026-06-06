"use client";

import { TelegramLinkDialog } from "@web/components/integrations/telegram-link-dialog";
import { AddRepoForm } from "@web/components/repos/add-repo-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@web/components/ui/card";
import { api } from "@web/lib/api-client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { IntegrationToggle } from "./integration-toggle";

interface TelegramChannel {
  chatId: string;
  enabled: boolean;
}

interface TelegramStatusResponse {
  linked: boolean;
  channel?: TelegramChannel;
}

export function QuickActions() {
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramChannel, setTelegramChannel] =
    useState<TelegramChannel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const fetchTelegramStatus = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await api.get<TelegramStatusResponse>(
          "/channels/telegram/status",
        );
        setTelegramLinked(data.linked);
        if (data.linked && data.channel) {
          setTelegramChannel({
            chatId: data.channel.chatId,
            enabled: data.channel.enabled,
          });
        }
      } catch {
        // Ignore errors
      }
    });
  }, []);

  useEffect(() => {
    fetchTelegramStatus();
  }, [fetchTelegramStatus]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Quick Actions</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <AddRepoForm />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Integrations</CardTitle>
            <CardDescription className="text-xs">
              Manage your notification channels
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <IntegrationToggle
              type="telegram"
              linked={telegramLinked}
              enabled={telegramChannel?.enabled ?? false}
              chatId={telegramChannel?.chatId}
              onLink={() => setDialogOpen(true)}
              onToggle={(enabled) => {
                if (telegramChannel) {
                  setTelegramChannel({ ...telegramChannel, enabled });
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <TelegramLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
