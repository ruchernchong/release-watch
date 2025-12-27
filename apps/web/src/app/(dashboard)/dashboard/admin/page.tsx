import { Activity, ArrowRight, Shield, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
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

      {/* Stats */}
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-lg">System Metrics</h2>
        <AdminStatsCards />
      </section>

      {/* Quick Access */}
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <QuickAccessCard
            title="User Management"
            description="View, search, and manage user accounts. Ban or unban users as needed."
            href="/dashboard/admin/users"
            icon={Users}
            iconBg="bg-blue-500"
          />
          <QuickAccessCard
            title="Activity Logs"
            description="Monitor user sessions and login activity across the platform."
            href="/dashboard/admin/activity"
            icon={Activity}
            iconBg="bg-purple-500"
          />
        </div>
      </section>
    </div>
  );
}

interface QuickAccessCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

function QuickAccessCard({
  title,
  description,
  href,
  icon: Icon,
  iconBg,
}: QuickAccessCardProps) {
  return (
    <Link href={href as Route}>
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <CardHeader className="flex flex-row items-center gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className="size-6 text-white" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {title}
              <ArrowRight className="size-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
            </CardTitle>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
