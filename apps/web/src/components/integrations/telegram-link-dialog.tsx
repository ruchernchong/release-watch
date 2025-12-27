"use client";

import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";

interface TelegramLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface GenerateCodeResponse {
  code: string;
}

export function TelegramLinkDialog({
  open,
  onOpenChange,
  onSuccess,
}: TelegramLinkDialogProps) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const generateCode = () => {
    setError(null);

    startTransition(async () => {
      try {
        const data = await api.post<GenerateCodeResponse>(
          "/integrations/telegram/generate",
        );
        setCode(data.code);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate code",
        );
      }
    });
  };

  const copyCode = async () => {
    if (!code) return;

    await navigator.clipboard.writeText(`/link ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setCode(null);
      setError(null);
      setCopied(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Telegram Account</DialogTitle>
          <DialogDescription>
            Connect your Telegram account to receive release notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!code ? (
            <>
              <p className="text-muted-foreground text-sm">
                Generate a one-time code and send it to our Telegram bot to link
                your account.
              </p>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button onClick={generateCode} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Link Code"
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-sm">
                  Send this command to{" "}
                  <a
                    href="https://t.me/ReleaseWatch_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline"
                  >
                    @ReleaseWatch_Bot
                  </a>
                  :
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-4 py-3 font-mono text-lg">
                    /link {code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  This code expires in 10 minutes.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a
                  href="https://t.me/ReleaseWatch_Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open Telegram Bot
                </a>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
