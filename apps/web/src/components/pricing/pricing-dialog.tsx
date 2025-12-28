"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PricingCards } from "./pricing-cards";

interface PricingDialogProps {
  children: React.ReactNode;
}

export function PricingDialog({ children }: PricingDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl">Choose your plan</SheetTitle>
          <SheetDescription>
            Start free and upgrade when you need more.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <PricingCards compact onCheckout={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
