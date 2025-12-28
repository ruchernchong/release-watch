import { Bell } from "lucide-react";
import Link from "next/link";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pricing - ReleaseWatch",
  description:
    "Simple, transparent pricing. Start free and upgrade when you need more.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-bold text-xl">
            ReleaseWatch
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="container relative mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center">
            <Badge variant="secondary" className="gap-1.5">
              <Bell className="size-3" />
              Simple, transparent pricing
            </Badge>

            <h1 className="mx-auto max-w-2xl font-bold text-4xl tracking-tight sm:text-5xl">
              Choose your plan
            </h1>

            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              Start free and upgrade when you need more. No credit card required
              to get started.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 pb-20">
          <PricingCards />
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-20 text-center">
            <h2 className="font-bold text-2xl">Ready to get started?</h2>
            <p className="max-w-md text-muted-foreground">
              Start with the free plan and upgrade anytime. No credit card
              required.
            </p>
            <Button size="lg" asChild>
              <Link href="/login">Start Monitoring</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex items-center justify-center px-4 py-8 text-muted-foreground text-sm">
          <p>Built with Cloudflare Workers, Next.js, and Neon PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
