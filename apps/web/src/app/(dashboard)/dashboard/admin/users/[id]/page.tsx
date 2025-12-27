import { ArrowLeft, Shield } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { UserDetailCard } from "@/components/admin/user-detail-card";
import { Button } from "@/components/ui/button";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={"/dashboard/admin/users" as Route}>
            <ArrowLeft className="size-4" />
            Back to Users
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-3xl tracking-tight">User Details</h1>
            <p className="text-muted-foreground">
              View and manage user account
            </p>
          </div>
        </div>
      </div>

      {/* User Detail */}
      <UserDetailCard userId={id} />
    </div>
  );
}
