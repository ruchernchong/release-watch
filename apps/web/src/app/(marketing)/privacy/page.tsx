import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy - ReleaseWatch",
  description: "Privacy Policy for ReleaseWatch",
};

const sections = [
  {
    title: "1. Information We Collect",
    content:
      "We collect information you provide directly and information collected automatically when you use the Service.",
    subsections: [
      {
        subtitle: "Account Information",
        content:
          "When you sign in with GitHub, Google, or Discord, we receive your email address, display name, and profile picture from these providers.",
      },
      {
        subtitle: "Usage Data",
        content:
          "We collect information about how you use the Service, including repositories you track, notification preferences, and feature usage.",
      },
      {
        subtitle: "Technical Data",
        content:
          "We automatically collect IP addresses, browser type, device information, and access times for security and analytics purposes.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: "We use the information we collect to:",
    list: [
      "Provide and maintain the Service",
      "Send notifications about repository releases",
      "Improve and personalize your experience",
      "Communicate with you about service updates",
      "Detect and prevent security issues",
      "Comply with legal obligations",
    ],
  },
  {
    title: "3. Third-Party Services",
    content:
      "We integrate with and share data with the following third-party services:",
    subsections: [
      {
        subtitle: "GitHub",
        content:
          "We access public repository information to monitor releases. We use GitHub for authentication.",
      },
      {
        subtitle: "Telegram & Discord",
        content:
          "We send notifications through these platforms using the channel information you provide.",
      },
      {
        subtitle: "Analytics",
        content:
          "We use Vercel Analytics and Umami to understand how users interact with the Service. These tools collect anonymized usage data.",
      },
      {
        subtitle: "AI Services",
        content:
          "We use Cloudflare AI to generate release summaries. Release notes may be processed by these services.",
      },
    ],
  },
  {
    title: "4. Data Storage and Security",
    content:
      "Your data is stored on Neon PostgreSQL (database) and Cloudflare (edge caching). We implement appropriate technical and organizational measures to protect your data, including encryption in transit and at rest.",
  },
  {
    title: "5. Data Retention",
    content:
      "We retain your data for as long as your account is active. When you delete your account, we delete your personal data within 30 days, except where retention is required by law.",
  },
  {
    title: "6. Your Rights",
    content:
      "Depending on your location, you may have the following rights regarding your personal data:",
    list: [
      "Access and receive a copy of your data",
      "Correct inaccurate data",
      "Delete your data",
      "Object to or restrict processing",
      "Data portability",
      "Withdraw consent at any time",
    ],
  },
  {
    title: "7. Cookies",
    content:
      "We use essential cookies for authentication and session management. We use analytics cookies to understand usage patterns. You can control cookie preferences through your browser settings.",
  },
  {
    title: "8. Children's Privacy",
    content:
      "The Service is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.",
  },
  {
    title: "9. International Data Transfers",
    content:
      "Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.",
  },
  {
    title: "10. Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. We will notify you of significant changes through the Service or via email. Continued use after changes constitutes acceptance.",
  },
];

export default function PrivacyPage() {
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
              Privacy Policy
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
                {section.subsections && (
                  <div className="mt-4 flex flex-col gap-4 border-l-2 border-border pl-4">
                    {section.subsections.map((sub) => (
                      <div key={sub.subtitle}>
                        <h3 className="mb-1 font-medium text-foreground">
                          {sub.subtitle}
                        </h3>
                        <p className="text-muted-foreground">{sub.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            <section>
              <h2 className="mb-3 font-semibold text-xl">
                11. Contact Information
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                For privacy-related questions or to exercise your rights, please
                contact us through our{" "}
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
