"use client";

import { AlertTriangle, Ban, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";

interface BanUserDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBanned: () => void;
}

const DURATION_OPTIONS = [
  { value: "86400", label: "1 day" },
  { value: "604800", label: "7 days" },
  { value: "2592000", label: "30 days" },
  { value: "permanent", label: "Permanent" },
];

export function BanUserDialog({
  user,
  open,
  onOpenChange,
  onBanned,
}: BanUserDialogProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("604800");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBan = () => {
    startTransition(async () => {
      try {
        setError(null);
        await api.post(`/admin/users/${user.id}/ban`, {
          action: "ban",
          banReason: reason || undefined,
          banExpiresIn: duration === "permanent" ? undefined : Number(duration),
        });
        onBanned();
        onOpenChange(false);
        setReason("");
        setDuration("604800");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to ban user");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
              <Ban className="size-4 text-destructive" />
            </div>
            Ban User
          </DialogTitle>
          <DialogDescription>
            Ban <span className="font-medium text-foreground">{user.name}</span>{" "}
            ({user.email}) from accessing the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-amber-600 text-sm dark:text-amber-400">
              This action will immediately revoke the user&apos;s access. They
              will not be able to log in until unbanned.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for banning this user..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBan}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Banning...
              </>
            ) : (
              <>
                <Ban className="size-4" />
                Ban User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
