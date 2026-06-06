"use client";

import {
  Avatar,
  Button,
  Dropdown,
  Header,
  Label,
  Separator,
  Typography,
} from "@heroui/react";
import { useUserTier } from "@web/hooks/use-user-tier";
import { signOut, useSession } from "@web/lib/auth-client";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Key } from "react";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const { tier } = useUserTier();

  const user = session?.user;
  const tierLabel = tier === "pro" ? "Pro" : "Free";

  if (!user) {
    return null;
  }

  const initial = user.name?.charAt(0).toUpperCase() ?? "U";

  const handleAction = (key: Key) => {
    if (key === "settings") {
      router.push("/dashboard/settings");
    } else if (key === "logout") {
      signOut();
    }
  };

  return (
    <Dropdown>
      <Button isIconOnly aria-label="User menu" variant="ghost">
        <Avatar size="sm">
          {user.image && (
            <Avatar.Image src={user.image} alt={user.name ?? "User"} />
          )}
          <Avatar.Fallback>{initial}</Avatar.Fallback>
        </Avatar>
      </Button>
      <Dropdown.Popover className="min-w-56">
        <Dropdown.Menu aria-label="User menu" onAction={handleAction}>
          <Dropdown.Section>
            <Header>
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  {user.image && (
                    <Avatar.Image src={user.image} alt={user.name ?? "User"} />
                  )}
                  <Avatar.Fallback>{initial}</Avatar.Fallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <Typography type="body-sm" weight="semibold" truncate>
                    {user.name}
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    {tierLabel}
                  </Typography>
                </div>
              </div>
            </Header>
            <Dropdown.Item id="settings" textValue="Settings">
              <Settings className="size-4 text-muted" />
              <Label>Settings</Label>
            </Dropdown.Item>
          </Dropdown.Section>
          <Separator />
          <Dropdown.Item id="logout" textValue="Log out" variant="danger">
            <LogOut className="size-4 text-danger" />
            <Label>Log out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
