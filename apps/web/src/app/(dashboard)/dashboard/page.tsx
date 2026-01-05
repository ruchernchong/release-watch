import { Overview } from "@/components/dashboard/overview";
import { getTelegramStatus } from "@/lib/data/channels";
import { getDashboardStats, getReleases } from "@/lib/data/dashboard";

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
