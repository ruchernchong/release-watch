import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/dist/client/script";
import type { ReactNode } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReleaseWatch - Never Miss a GitHub Release",
  description:
    "Monitor GitHub releases and get notified via Telegram, Discord, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
      <Script
        defer
        src="https://umami.tartinerlabs.com/script.js"
        data-website-id="f76430ee-22b4-49a4-ad62-7ac393f12116"
        data-domains="releasewatch.dev"
      />
    </html>
  );
}
