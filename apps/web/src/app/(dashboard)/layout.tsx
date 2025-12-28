import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <NuqsAdapter>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-6 px-4 pb-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </NuqsAdapter>
  );
}
