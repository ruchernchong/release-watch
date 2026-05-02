// TODO: Revisit when HeroUI Pro no longer requires client rendering here;
// this works around the current createContext Server Component bug.
"use client";

import { Card, Chip, Separator } from "@heroui/react";
import {
  ItemCard,
  ItemCardGroup,
  KPI,
  KPIGroup,
  Navbar,
  TrendChip,
  Widget,
} from "@heroui-pro/react";
import {
  Bot,
  Boxes,
  CheckCircle2,
  Github,
  GitPullRequestArrow,
  MessageCircle,
  RadioTower,
  Rocket,
  Send,
  Sparkles,
  TerminalSquare,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GitHubStars } from "@/components/marketing/github-stars";

const navItems = [
  { href: "#workflow", label: "Workflow" },
  { href: "#channels", label: "Channels" },
  { href: "/pricing", label: "Pricing" },
];

const releases = [
  {
    name: "vercel/next.js",
    version: "v16.2.3",
    summary:
      "Cache revalidation fixes, Turbopack stability, React 19 compiler updates.",
    status: "Summarized",
    trend: "+18m",
  },
  {
    name: "cloudflare/workers-sdk",
    version: "v4.2026.5",
    summary:
      "Wrangler deploy output now includes queue and workflow binding diffs.",
    status: "Routed",
    trend: "+27m",
  },
  {
    name: "neondatabase/neon",
    version: "v1.8.0",
    summary:
      "Branch restore flow tightened with safer connection pooling defaults.",
    status: "Watching",
    trend: "+41m",
  },
];

const workflow = [
  {
    icon: Github,
    title: "Track the repos that matter",
    description:
      "Add public GitHub repositories once. ReleaseWatch keeps watch for tags, releases, and version bumps.",
  },
  {
    icon: Sparkles,
    title: "Turn changelogs into signal",
    description:
      "AI summaries compress noisy release notes into the behavior changes your team actually needs.",
  },
  {
    icon: RadioTower,
    title: "Route every update",
    description:
      "Send releases to Telegram, Discord, email, or webhooks with the same account-level routing rules.",
  },
];

const channels = [
  {
    icon: Github,
    title: "GitHub",
    description: "Watch public repositories and import starred projects.",
    action: "Source",
  },
  {
    icon: Send,
    title: "Telegram",
    description: "Push release alerts directly to private chats or groups.",
    action: "Instant",
  },
  {
    icon: MessageCircle,
    title: "Discord",
    description:
      "Keep project channels aware of dependency and platform changes.",
    action: "Team",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description:
      "Trigger automations in your own deploy, docs, or ticketing systems.",
    action: "Custom",
  },
];

function ReleaseWatchMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex size-8 items-center justify-center rounded-xl bg-foreground text-background">
        <RadioTower className="size-4" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-background" />
      </div>
      <span className="font-semibold text-foreground text-sm tracking-tight">
        ReleaseWatch
      </span>
    </div>
  );
}

function AnchorButton({
  children,
  className = "",
  href,
  rel,
  target,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  rel?: string;
  target?: string;
  variant?: "primary" | "outline";
}) {
  return (
    <a
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-6 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-background text-foreground hover:bg-accent"
      } ${className}`}
      href={href}
      rel={rel}
      target={target}
    >
      {children}
    </a>
  );
}

function LoginButton({
  variant = "primary",
}: {
  variant?: "primary" | "outline";
}) {
  return (
    <AnchorButton href="/login" variant={variant}>
      Start Monitoring
    </AnchorButton>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="absolute -inset-12 rounded-[3rem] bg-[radial-gradient(circle_at_50%_10%,oklch(0.78_0.18_150_/_0.22),transparent_38%),radial-gradient(circle_at_10%_80%,oklch(0.62_0.18_250_/_0.16),transparent_34%)] blur-3xl" />
      <div className="relative grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Widget className="border border-white/10 bg-zinc-950/80 text-white shadow-2xl shadow-black/40 backdrop-blur">
          <Widget.Header>
            <Widget.Title className="text-white">Release Radar</Widget.Title>
            <Widget.Description className="text-white/55">
              3 important releases detected in the last hour
            </Widget.Description>
          </Widget.Header>
          <Widget.Content className="bg-zinc-900/90 p-4">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-white/50 text-xs">Tracked repos</p>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-semibold text-2xl tabular-nums">128</p>
                    <TrendChip trend="up" variant="tertiary">
                      14%
                    </TrendChip>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-white/50 text-xs">AI summaries</p>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-semibold text-2xl tabular-nums">342</p>
                    <TrendChip trend="up" variant="tertiary">
                      31%
                    </TrendChip>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-white/50 text-xs">Routes online</p>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-semibold text-2xl tabular-nums">4</p>
                    <Chip color="success" size="sm" variant="soft">
                      Live
                    </Chip>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {releases.map((release) => (
                  <div
                    className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
                    key={release.name}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                          <GitPullRequestArrow className="size-5 text-emerald-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-sm text-white">
                              {release.name}
                            </p>
                            <Chip size="sm" variant="tertiary">
                              {release.version}
                            </Chip>
                          </div>
                          <p className="pt-1 text-sm text-white/58 leading-5">
                            {release.summary}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Chip color="success" size="sm" variant="soft">
                          {release.status}
                        </Chip>
                        <span className="text-white/40 text-xs tabular-nums">
                          {release.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Widget.Content>
        </Widget>

        <div className="grid gap-4">
          <Card className="overflow-hidden border border-emerald-400/20 bg-emerald-400/10 text-white shadow-2xl shadow-emerald-950/30">
            <Card.Header>
              <div className="flex items-center gap-2 text-emerald-200">
                <Bot className="size-4" />
                <span className="font-medium text-sm">AI brief</span>
              </div>
              <Card.Title className="text-white">
                React compiler changes are safe for this workspace.
              </Card.Title>
              <Card.Description className="text-emerald-50/70">
                No breaking API changes detected. One cache regression fix
                should be prioritized for Next.js apps using route handlers.
              </Card.Description>
            </Card.Header>
          </Card>

          <ItemCardGroup className="overflow-hidden border border-white/10 bg-zinc-950/80 text-white backdrop-blur">
            <ItemCard variant="transparent">
              <ItemCard.Icon className="bg-white/10 text-white">
                <MessageCircle />
              </ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title className="text-white">Telegram</ItemCard.Title>
                <ItemCard.Description className="text-white/50">
                  Delivered 11:32
                </ItemCard.Description>
              </ItemCard.Content>
              <ItemCard.Action>
                <CheckCircle2 className="size-5 text-emerald-300" />
              </ItemCard.Action>
            </ItemCard>
            <Separator className="bg-white/10" />
            <ItemCard variant="transparent">
              <ItemCard.Icon className="bg-white/10 text-white">
                <Webhook />
              </ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title className="text-white">Webhook</ItemCard.Title>
                <ItemCard.Description className="text-white/50">
                  200 OK in 184ms
                </ItemCard.Description>
              </ItemCard.Content>
              <ItemCard.Action>
                <CheckCircle2 className="size-5 text-emerald-300" />
              </ItemCard.Action>
            </ItemCard>
          </ItemCardGroup>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.92_0_0_/_0.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.92_0_0_/_0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,oklch(0.72_0.18_156_/_0.16),transparent_34%),radial-gradient(circle_at_90%_20%,oklch(0.64_0.16_250_/_0.12),transparent_28%)]" />

      <Navbar
        className="border-border/60 border-b bg-background/85 backdrop-blur-xl"
        maxWidth="xl"
        position="sticky"
        shouldBlockScroll={false}
      >
        <Navbar.Header>
          <Navbar.MenuToggle className="md:hidden" />
          <Navbar.Brand>
            <Link href="/" className="no-underline">
              <ReleaseWatchMark />
            </Link>
          </Navbar.Brand>
          <Navbar.Content className="hidden md:flex">
            {navItems.map((item) => (
              <Navbar.Item href={item.href} key={item.href}>
                {item.label}
              </Navbar.Item>
            ))}
          </Navbar.Content>
          <Navbar.Spacer />
          <Navbar.Content>
            <Navbar.Item className="hidden sm:flex" href="/login">
              Log in
            </Navbar.Item>
            <AnchorButton className="h-8 px-3" href="/login">
              Get Started
            </AnchorButton>
          </Navbar.Content>
        </Navbar.Header>
        <Navbar.Menu>
          {navItems.map((item) => (
            <Navbar.MenuItem href={item.href} key={item.href}>
              {item.label}
            </Navbar.MenuItem>
          ))}
          <Navbar.MenuItem href="/login">Log in</Navbar.MenuItem>
        </Navbar.Menu>
      </Navbar>

      <main className="flex flex-col">
        <section className="container mx-auto flex flex-col items-center gap-12 px-4 py-16 text-center sm:py-20 lg:py-24">
          <div className="flex max-w-4xl flex-col items-center gap-6">
            <Chip className="w-fit" color="success" variant="soft">
              <RadioTower className="size-3.5" />
              <Chip.Label>
                Release intelligence for teams that ship fast
              </Chip.Label>
            </Chip>
            <h1 className="max-w-4xl text-balance font-semibold text-5xl tracking-[-0.06em] sm:text-6xl md:text-7xl lg:text-8xl">
              Stop reading every changelog by hand.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground leading-8 sm:text-xl">
              Monitor GitHub releases, get AI-generated summaries, and route the
              important updates to the channels your team already checks.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <LoginButton />
              <AnchorButton
                href="https://github.com/ruchernchong/release-watch"
                rel="noopener noreferrer"
                target="_blank"
                variant="outline"
              >
                <Github className="size-4" />
                View GitHub
              </AnchorButton>
            </div>
            <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm sm:flex-row">
              <GitHubStars />
              <Separator
                className="hidden h-4 sm:block"
                orientation="vertical"
              />
              <span>Built on Cloudflare Workers, Next.js, and Neon.</span>
            </div>
          </div>

          <ProductPreview />
        </section>

        <section className="container mx-auto px-4 py-12">
          <KPIGroup className="mx-auto max-w-5xl">
            <KPI>
              <KPI.Header>
                <KPI.Title>Repos tracked</KPI.Title>
              </KPI.Header>
              <KPI.Content>
                <KPI.Value maximumFractionDigits={0} value={25} />
                <KPI.Trend trend="neutral">Free</KPI.Trend>
              </KPI.Content>
            </KPI>
            <KPIGroup.Separator />
            <KPI>
              <KPI.Header>
                <KPI.Title>Pro summaries</KPI.Title>
              </KPI.Header>
              <KPI.Content>
                <KPI.Value
                  maximumFractionDigits={0}
                  notation="compact"
                  value={999_999}
                />
                <KPI.Trend trend="up">Unlimited</KPI.Trend>
              </KPI.Content>
            </KPI>
            <KPIGroup.Separator />
            <KPI>
              <KPI.Header>
                <KPI.Title>History window</KPI.Title>
              </KPI.Header>
              <KPI.Content>
                <KPI.Value maximumFractionDigits={0} value={90} />
                <KPI.Trend trend="up">days</KPI.Trend>
              </KPI.Content>
            </KPI>
          </KPIGroup>
        </section>

        <section
          className="container mx-auto flex flex-col gap-10 px-4 py-20"
          id="workflow"
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <Chip variant="tertiary">
              <TerminalSquare className="size-3.5" />
              <Chip.Label>Workflow</Chip.Label>
            </Chip>
            <h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-5xl">
              Release monitoring that behaves like an operations console.
            </h2>
            <p className="text-muted-foreground leading-7">
              ReleaseWatch is intentionally small: watch, understand, route. No
              feed fatigue, no manual checking, no surprise framework upgrades.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {workflow.map((item) => (
              <Card
                className="min-h-72 justify-between overflow-hidden"
                key={item.title}
              >
                <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_50%_0%,oklch(0.74_0.16_156_/_0.18),transparent_70%)]" />
                <Card.Header className="relative gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
                    <item.icon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Card.Title className="text-xl">{item.title}</Card.Title>
                    <Card.Description className="text-base leading-7">
                      {item.description}
                    </Card.Description>
                  </div>
                </Card.Header>
              </Card>
            ))}
          </div>
        </section>

        <section
          className="border-border/70 border-y bg-muted/30"
          id="channels"
        >
          <div className="container mx-auto grid gap-10 px-4 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="flex flex-col gap-5">
              <Chip className="w-fit" variant="tertiary">
                <Boxes className="size-3.5" />
                <Chip.Label>Integrations</Chip.Label>
              </Chip>
              <h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-5xl">
                One release source. Multiple delivery paths.
              </h2>
              <p className="text-muted-foreground leading-7">
                Keep solo projects lightweight or wire ReleaseWatch into a team
                workflow with Discord and webhooks. The same release can notify
                people and automation at once.
              </p>
              <AnchorButton className="w-fit" href="/pricing" variant="outline">
                Compare Plans
              </AnchorButton>
            </div>

            <ItemCardGroup columns={2} layout="grid">
              {channels.map((channel) => (
                <ItemCard key={channel.title} variant="default">
                  <ItemCard.Icon>
                    <channel.icon />
                  </ItemCard.Icon>
                  <ItemCard.Content>
                    <ItemCard.Title>{channel.title}</ItemCard.Title>
                    <ItemCard.Description className="whitespace-normal">
                      {channel.description}
                    </ItemCard.Description>
                  </ItemCard.Content>
                  <ItemCard.Action>
                    <Chip size="sm" variant="soft">
                      {channel.action}
                    </Chip>
                  </ItemCard.Action>
                </ItemCard>
              ))}
            </ItemCardGroup>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <Card className="relative overflow-hidden bg-zinc-950 p-0 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,oklch(0.76_0.17_150_/_0.24),transparent_34%),radial-gradient(circle_at_80%_50%,oklch(0.62_0.18_250_/_0.18),transparent_32%)]" />
            <Card.Content className="relative grid gap-8 p-8 md:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex max-w-2xl flex-col gap-4">
                <Chip
                  className="w-fit bg-white/10 text-white"
                  variant="tertiary"
                >
                  <Rocket className="size-3.5" />
                  <Chip.Label>Ready for your first watchlist</Chip.Label>
                </Chip>
                <h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-5xl">
                  Let the releases come to you.
                </h2>
                <p className="text-lg text-white/65 leading-8">
                  Start free with 25 tracked repositories. Upgrade when you need
                  unlimited repos, unlimited AI summaries, and longer
                  notification history.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <LoginButton />
                <AnchorButton
                  href="/pricing"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  View Pricing
                </AnchorButton>
              </div>
            </Card.Content>
          </Card>
        </section>
      </main>

      <footer className="border-border/70 border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-muted-foreground text-sm sm:flex-row">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ReleaseWatchMark />
            <span>
              Built with Cloudflare Workers, Next.js, and Neon PostgreSQL.
            </span>
          </div>
          <nav className="flex gap-6">
            <Link
              className="transition-colors hover:text-foreground"
              href="/terms"
            >
              Terms
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
