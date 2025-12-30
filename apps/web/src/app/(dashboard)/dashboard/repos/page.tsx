import { AddRepoForm } from "@/components/repos/add-repo-form";
import { ReposTable } from "@/components/repos/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRepos } from "@/lib/data/repos";

export default async function ReposPage() {
  const { repos } = await getRepos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl">Repositories</h1>
        <p className="text-muted-foreground">
          Repositories you're watching for new releases.
        </p>
      </div>

      <AddRepoForm />

      <Card>
        <CardHeader>
          <CardTitle>Watched Repositories</CardTitle>
          <CardDescription>
            You'll receive notifications when these repositories publish new
            releases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReposTable initialRepos={repos} />
        </CardContent>
      </Card>
    </div>
  );
}
