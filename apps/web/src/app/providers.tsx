"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { type ReactNode, useEffect } from "react";

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: "/ingest",
      person_profiles: "identified_only",
      defaults: "2025-11-30",
    });
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <PostHogProvider client={posthog}>{children}</PostHogProvider>
    </NextThemesProvider>
  );
}
