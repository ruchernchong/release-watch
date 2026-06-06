import { buttonVariants, Chip } from "@heroui/react";
import { MarketingPricing } from "@web/components/marketing/marketing-pricing";
import { Bell } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pricing - ShipRadar",
  description:
    "Simple, transparent pricing. Start free and upgrade when you need more.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-separator border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-semibold text-foreground text-lg">
            ShipRadar
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost" })}
            >
              Log in
            </Link>
            <Link href="/login" className={buttonVariants()}>
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-[-12rem] left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
          />
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-20 text-center">
            <Chip color="accent" variant="soft">
              <Bell className="size-3.5" />
              <Chip.Label>Simple, transparent pricing</Chip.Label>
            </Chip>
            <h1 className="font-bold text-4xl tracking-tight sm:text-5xl">
              Choose your plan
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Start free and upgrade when you need more. No credit card required
              to get started.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <MarketingPricing />
        </section>

        {/* CTA */}
        <section className="border-separator border-t">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-20 text-center">
            <h2 className="font-bold text-2xl tracking-tight">
              Ready to get started?
            </h2>
            <p className="max-w-md text-muted">
              Start with the free plan and upgrade anytime. No credit card
              required.
            </p>
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Start Monitoring
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-separator border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-muted text-sm sm:flex-row">
          <p>Built with Next.js, Hono on Vercel, and Neon PostgreSQL.</p>
          <nav className="flex gap-6">
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
