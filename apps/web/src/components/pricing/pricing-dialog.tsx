"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PricingCards } from "./pricing-cards";

interface PricingDialogProps {
  children: React.ReactNode;
}

export function PricingDialog({ children }: PricingDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Choose your plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Start free and upgrade when you need more.
          </DialogDescription>
        </DialogHeader>
        <PricingCards onCheckout={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
