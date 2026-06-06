import { Overview } from "@web/components/dashboard/overview";
import { getTelegramStatus } from "@web/lib/data/channels";
import { getDashboardStats, getReleases } from "@web/lib/data/dashboard";

export default async function DashboardPage() {
  const [stats, releasesData, telegramStatus] = await Promise.all([
    getDashboardStats(),
    getReleases(4),
    getTelegramStatus(),
  ]);

  return (
    <Overview
      stats={stats}
      releases={releasesData.releases}
      telegramStatus={telegramStatus}
    />
  );
}
