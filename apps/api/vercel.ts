import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  crons: [
    {
      path: "/internal/release-check",
      schedule: "*/15 * * * *",
    },
  ],
};
