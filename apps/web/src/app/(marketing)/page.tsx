import { Bell, Github, MessageCircle, Webhook } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Github,
    title: "GitHub Integration",
    description: "Monitor any public GitHub repository for new releases.",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    description: "Get notified via Telegram, Discord, or webhooks.",
  },
  {
    icon: MessageCircle,
    title: "AI Summaries",
    description: "Receive concise AI-generated summaries of release notes.",
  },
  {
    icon: Webhook,
    title: "Multi-Channel",
    description: "Connect multiple notification channels to your account.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col gap-0">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">ReleaseWatch</span>
          <nav className="flex items-center gap-4">
            <Link href="#">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="#">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="container mx-auto flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Never Miss a GitHub Release
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Monitor your favorite repositories and get notified when new
            versions are released. AI-powered summaries help you stay informed.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="#">
              <Button size="lg">Start Monitoring</Button>
            </Link>
            <Link
              href="https://github.com/ruchernchong/release-watch"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                <Github className="size-4" />
                View on GitHub
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="container mx-auto flex flex-col gap-12 px-4 py-24">
            <h2 className="text-center text-3xl font-bold">Features</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader className="flex flex-col gap-2">
                    <feature.icon className="size-8" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto flex items-center justify-center px-4 py-8 text-sm text-muted-foreground">
          <p>Built with Cloudflare Workers, Next.js, and Neon PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
