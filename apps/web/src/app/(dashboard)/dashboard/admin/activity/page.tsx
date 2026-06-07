import {
  ActivityTable,
  ActivityTableSkeleton,
} from "@web/components/admin/activity-table";
import { AdminNav } from "@web/components/admin/admin-nav";
import { getAdminActivity } from "@web/lib/data/admin";
import { Activity, Shield } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { adminActivitySearchParamsCache } from "./search-params";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function AdminActivityPage({ searchParams }: PageProps) {
  const { offset } = await adminActivitySearchParamsCache.parse(searchParams);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
            <Shield className="size-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Admin</h1>
            <p className="text-muted">
              System overview and administration tools
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <AdminNav />

      {/* Activity Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Activity className="size-5" />
          <h2 className="font-semibold text-lg">Activity Logs</h2>
        </div>
        <Suspense fallback={<ActivityTableSkeleton />}>
          <AdminActivityTable offset={offset} />
        </Suspense>
      </section>
    </div>
  );
}

async function AdminActivityTable({ offset }: { offset: number }) {
  const data = await getAdminActivity({ limit: 20, offset });
  return <ActivityTable data={data} />;
}
