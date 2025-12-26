"use client";

import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddSubscriptionDialog } from "./add-subscription-dialog";
import {
  SubscriptionList,
  type SubscriptionListRef,
} from "./subscription-list";

export function SubscriptionsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const listRef = useRef<SubscriptionListRef>(null);

  const handleSuccess = () => {
    listRef.current?.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your repository subscriptions and notification channels.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Add Repository
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>
              Repositories you are monitoring for releases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionList ref={listRef} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Where you receive release notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No channels configured. Add a channel to receive notifications.
            </p>
          </CardContent>
        </Card>
      </div>

      <AddSubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
