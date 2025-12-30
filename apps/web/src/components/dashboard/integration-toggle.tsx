"use client";

import { Check, ExternalLink, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api-client";

interface IntegrationToggleProps {
  type: "telegram" | "discord";
  linked: boolean;
  enabled: boolean;
  chatId?: string;
  onLink: () => void;
  onToggle: (enabled: boolean) => void;
}

export function IntegrationToggle({
  type,
  linked,
  enabled,
  chatId,
  onLink,
  onToggle,
}: IntegrationToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [localEnabled, setLocalEnabled] = useState(enabled);

  const handleToggle = (checked: boolean) => {
    setLocalEnabled(checked);
    startTransition(async () => {
      try {
        await api.patch("/channels/telegram/toggle", {
          chatId,
          enabled: checked,
        });
        onToggle(checked);
      } catch {
        setLocalEnabled(!checked);
      }
    });
  };

  const config = integrationConfig[type];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${config.iconBg}`}
        >
          <config.icon className="size-4 text-white" />
        </div>
        <div className="flex flex-col">
          <Label className="font-medium">{config.label}</Label>
          {linked ? (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Check className="size-3 text-emerald-500" />
              Connected
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Not connected</span>
          )}
        </div>
      </div>

      {linked ? (
        <div className="flex items-center gap-3">
          <Switch
            checked={localEnabled}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
          <Button variant="ghost" size="icon" asChild>
            <a href={config.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onLink}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Connect"}
        </Button>
      )}
    </div>
  );
}

const integrationConfig = {
  telegram: {
    label: "Telegram",
    iconBg: "bg-[#0088cc]",
    icon: Send,
    link: "https://t.me/ReleaseWatch_Bot",
  },
  discord: {
    label: "Discord",
    iconBg: "bg-[#5865F2]",
    icon: Send,
    link: "#",
  },
};
