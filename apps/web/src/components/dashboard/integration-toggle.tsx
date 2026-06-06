"use client";

import {
  Avatar,
  Button,
  buttonVariants,
  Label,
  Link,
  Switch,
  Typography,
} from "@heroui/react";
import { api } from "@web/lib/api-client";
import { Check, ExternalLink, Send } from "lucide-react";
import { useState, useTransition } from "react";

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

  const handleToggle = (isSelected: boolean) => {
    setLocalEnabled(isSelected);
    startTransition(async () => {
      try {
        await api.patch("/channels/telegram/toggle", {
          chatId,
          enabled: isSelected,
        });
        onToggle(isSelected);
      } catch {
        setLocalEnabled(!isSelected);
      }
    });
  };

  const config = integrationConfig[type];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <Avatar.Fallback>
            <config.icon className="size-4" />
          </Avatar.Fallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <Label>{config.label}</Label>
          {linked && (
            <Typography type="body-xs" color="muted">
              <Check className="inline size-3 text-success" /> Connected
            </Typography>
          )}
          {!linked && (
            <Typography type="body-xs" color="muted">
              Not connected
            </Typography>
          )}
        </div>
      </div>

      {linked && (
        <div className="flex items-center gap-3">
          <Switch
            aria-label={`Toggle ${config.label} notifications`}
            isSelected={localEnabled}
            onChange={handleToggle}
            isDisabled={isPending}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
          <Link
            href={config.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${config.label}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              isIconOnly: true,
            })}
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>
      )}
      {!linked && (
        <Button
          variant="outline"
          size="sm"
          onPress={onLink}
          isDisabled={isPending}
          isPending={isPending}
        >
          Connect
        </Button>
      )}
    </div>
  );
}

const integrationConfig = {
  telegram: {
    label: "Telegram",
    icon: Send,
    link: "https://t.me/ShipRadar_Bot",
  },
  discord: {
    label: "Discord",
    icon: Send,
    link: "#",
  },
};
