import { buttonVariants } from "@heroui/react";
import { FeatureCards } from "@web/components/marketing/feature-cards";
import { GitHubStars } from "@web/components/marketing/github-stars";
import { NotificationDemo } from "@web/components/marketing/notification-demo";
import { Reveal } from "@web/components/marketing/reveal";
import { Github, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
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

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-[-12rem] left-1/2 -z-10 size-[36rem] -translate-x-1/2 animate-pulse rounded-full bg-accent/20 blur-[120px] [animation-duration:7s]"
          />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface px-3 py-1 text-muted text-sm">
                <Sparkles className="size-3.5 text-accent" />
                AI-powered release summaries
              </span>
              <h1 className="bg-gradient-to-br from-foreground to-foreground/55 bg-clip-text font-bold text-4xl text-transparent tracking-tight sm:text-5xl md:text-6xl">
                Never Miss a GitHub Release
              </h1>
              <p className="max-w-xl text-lg text-muted">
                Monitor your favorite repositories and get notified the moment
                new versions ship. AI-powered summaries help you stay informed
                without the noise.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/login" className={buttonVariants({ size: "lg" })}>
                  Start Monitoring
                </Link>
                <Link
                  href="https://github.com/tartinerlabs/shipradar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <Github className="size-4" />
                  View on GitHub
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <NotificationDemo />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-24">
          <Reveal className="flex flex-col items-center gap-3 text-center">
            <h2 className="font-bold text-3xl tracking-tight">
              Everything You Need to Stay Updated
            </h2>
            <p className="max-w-2xl text-muted">
              Track releases across your stack and route them to the channels
              your team already lives in.
            </p>
          </Reveal>
          <FeatureCards />
        </section>
      </main>

      <footer className="border-separator border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-muted text-sm sm:flex-row">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <GitHubStars />
            <p>Built with Next.js, Hono on Vercel, and Neon PostgreSQL.</p>
          </div>
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
