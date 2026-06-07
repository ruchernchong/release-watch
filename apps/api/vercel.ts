import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  relatedProjects: ["prj_bqVrIuICIqkTyFMood40VOfTXXQL"],
  // Temporary disabled due to Vercel Hobby account
  // crons: [
  //   {
  //     path: "/internal/release-check",
  //     schedule: "*/15 * * * *",
  //   },
  // ],
  git: {
    deploymentEnabled: {
      "renovate/**": false,
      "dependabot/**": false,
    },
  },
};
