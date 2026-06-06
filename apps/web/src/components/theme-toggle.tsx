"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type Key, useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button isIconOnly aria-label="Toggle theme" variant="ghost" isDisabled>
        <span className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Dropdown>
      <Button isIconOnly aria-label="Toggle theme" variant="ghost">
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </Button>
      <Dropdown.Popover className="min-w-40">
        <Dropdown.Menu
          aria-label="Theme"
          onAction={(key: Key) => setTheme(key as string)}
        >
          <Dropdown.Item id="light" textValue="Light">
            <Sun className="size-4 text-muted" />
            <Label>Light</Label>
          </Dropdown.Item>
          <Dropdown.Item id="dark" textValue="Dark">
            <Moon className="size-4 text-muted" />
            <Label>Dark</Label>
          </Dropdown.Item>
          <Dropdown.Item id="system" textValue="System">
            <Monitor className="size-4 text-muted" />
            <Label>System</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
