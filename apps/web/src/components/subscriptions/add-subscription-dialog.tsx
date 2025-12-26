"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddSubscriptionDialogProps) {
  const [repoInput, setRepoInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Extract owner/repo from URL or accept direct format
    const input = repoInput.trim();
    const match = input.match(
      /(?:https?:\/\/)?(?:github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/,
    );

    if (!match) {
      setError("Invalid format. Use owner/repo or a GitHub URL.");
      return;
    }

    const repoName = match[1];

    startTransition(async () => {
      try {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoName }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to add subscription");
          return;
        }

        setRepoInput("");
        onOpenChange(false);
        onSuccess();
      } catch {
        setError("Failed to add subscription");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Enter a GitHub repository to monitor for new releases.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="repo">Repository</Label>
              <Input
                id="repo"
                placeholder="owner/repo or GitHub URL"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                disabled={isPending}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !repoInput.trim()}>
              {isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
