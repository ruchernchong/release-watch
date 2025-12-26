import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReposTable } from "@/components/repos/table";

export default function ReposPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl">Repositories</h1>
        <p className="text-muted-foreground">
          Repositories you're watching for new releases.
        </p>
      </div>
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
