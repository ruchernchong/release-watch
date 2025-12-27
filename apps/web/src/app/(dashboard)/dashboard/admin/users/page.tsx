import { Shield, Users } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { UsersTable } from "@/components/admin/users-table";

export default function AdminUsersPage() {
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

      {/* Users Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <h2 className="font-semibold text-lg">User Management</h2>
        </div>
        <UsersTable />
      </section>
    </div>
  );
}
