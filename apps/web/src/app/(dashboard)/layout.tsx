import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { RepoSearch } from "@/components/repos/repo-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/user-menu";

function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar skeleton */}
      <div className="flex h-full w-64 flex-col gap-4 border-r bg-sidebar p-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b px-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-9 w-80" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    </div>
  );
}

function DashboardContent({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <div className="hidden flex-1 justify-center md:flex">
            <RepoSearch />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 px-4 pb-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <NuqsAdapter>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent>{children}</DashboardContent>
      </Suspense>
    </NuqsAdapter>
  );
}
