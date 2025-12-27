import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentReleases } from "@/components/dashboard/recent-releases";
import { StatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your repositories and manage notifications.
        </p>
      </div>

      <StatsCards />

      <RecentReleases />

      <QuickActions />
    </div>
  );
}
