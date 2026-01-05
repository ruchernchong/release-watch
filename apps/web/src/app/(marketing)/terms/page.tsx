import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service - ReleaseWatch",
  description: "Terms of Service for using ReleaseWatch",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content:
      "By accessing or using ReleaseWatch, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.",
  },
  {
    title: "2. Description of Service",
    content:
      "ReleaseWatch monitors GitHub repositories for new releases and sends notifications through various channels including Telegram and Discord. The Service may include AI-generated summaries of release notes.",
  },
  {
    title: "3. User Accounts",
    content:
      "To use certain features, you must create an account using GitHub, Google, or Discord authentication. You are responsible for maintaining account security and all activities under your account.",
    list: [
      "You must provide accurate account information",
      "You must not share your account credentials",
      "You must notify us of any unauthorized access",
      "You must be at least 13 years old to use the Service",
    ],
  },
  {
    title: "4. Acceptable Use",
    content: "You agree not to:",
    list: [
      "Use the Service for any unlawful purpose",
      "Attempt to interfere with or disrupt the Service",
      "Abuse the API or exceed reasonable usage limits",
      "Use automated means beyond intended functionality",
      "Impersonate another person or entity",
      "Sell, resell, or exploit the Service commercially",
    ],
  },
  {
    title: "5. GitHub Integration",
    content:
      "The Service integrates with GitHub to monitor public repository releases. We access only publicly available information and are not responsible for changes to GitHub's API or service availability.",
  },
  {
    title: "6. Notification Channels",
    content:
      "Notifications are sent through third-party platforms (Telegram, Discord). You are responsible for complying with their terms of service. Delivery depends on third-party service availability.",
  },
  {
    title: "7. Service Availability",
    content:
      "We strive to maintain high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue any part of the Service at any time without prior notice.",
  },
  {
    title: "8. Intellectual Property",
    content:
      "The Service, including its design and features, is owned by ReleaseWatch. You retain ownership of any content you submit. ReleaseWatch is open source and available under its respective license on GitHub.",
  },
  {
    title: "9. Limitation of Liability",
    content:
      "To the maximum extent permitted by law, ReleaseWatch shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.",
  },
  {
    title: "10. Disclaimer of Warranties",
    content:
      'The Service is provided "as is" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.',
  },
  {
    title: "11. Termination",
    content:
      "We may terminate or suspend your account at any time for violation of these terms. You may delete your account at any time. Upon termination, your right to use the Service will immediately cease.",
  },
  {
    title: "12. Changes to Terms",
    content:
      "We may update these Terms at any time. Continued use after changes constitutes acceptance. We will notify users of significant changes through the Service or via email.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
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
        <article className="container mx-auto max-w-3xl px-4 py-16">
          <header className="mb-12">
            <h1 className="mb-4 font-bold text-4xl tracking-tight">
              Terms of Service
            </h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </header>

          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-3 font-semibold text-xl">{section.title}</h2>
                <p className="leading-relaxed text-muted-foreground">
                  {section.content}
                </p>
                {section.list && (
                  <ul className="mt-3 flex flex-col gap-2 pl-6 text-muted-foreground">
                    {section.list.map((item) => (
                      <li key={item} className="list-disc">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <h2 className="mb-3 font-semibold text-xl">
                13. Contact Information
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                For questions about these Terms, please contact us through our{" "}
                <a
                  href="https://github.com/ruchernchong/release-watch/issues"
                  className="text-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repository
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>

      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-muted-foreground text-sm sm:flex-row">
          <p>Built with Cloudflare Workers, Next.js, and Neon PostgreSQL.</p>
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
