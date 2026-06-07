import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  relatedProjects: ["prj_gRc36XTIkuzdXMcvZK3tohzrbcNO"],
  git: {
    deploymentEnabled: {
      "renovate/**": false,
      "dependabot/**": false,
    },
  },
};
