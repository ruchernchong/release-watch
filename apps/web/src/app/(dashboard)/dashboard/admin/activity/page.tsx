import { Activity, Shield } from "lucide-react";

import { ActivityTable } from "@/components/admin/activity-table";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminActivityPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Admin</h1>
            <p className="text-muted-foreground">
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
        <ActivityTable />
      </section>
    </div>
  );
}
