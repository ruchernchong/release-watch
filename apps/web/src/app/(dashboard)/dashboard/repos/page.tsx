"use client";

import { AddRepoForm } from "@/components/repos/add-repo-form";
import { ReposTable } from "@/components/repos/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReposPage() {
  const handleSuccess = () => {
    // TODO: Refresh the repos table when real data is connected
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl">Repositories</h1>
        <p className="text-muted-foreground">
          Repositories you're watching for new releases.
        </p>
      </div>

      <AddRepoForm onSuccess={handleSuccess} />

      <Card>
        <CardHeader>
          <CardTitle>Watched Repositories</CardTitle>
          <CardDescription>
            You'll receive notifications when these repositories publish new
            releases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReposTable />
        </CardContent>
      </Card>
    </div>
  );
}
