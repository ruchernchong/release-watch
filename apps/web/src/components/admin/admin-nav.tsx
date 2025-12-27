"use client";

import { Activity, LayoutDashboard, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    title: "Activity",
    href: "/dashboard/admin/activity",
    icon: Activity,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
