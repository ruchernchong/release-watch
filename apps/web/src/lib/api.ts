import { withRelatedProject } from "@vercel/related-projects";

const apiHost = withRelatedProject({
  projectName: "shipradar-api",
  defaultHost: process.env.NEXT_PUBLIC_API_URL as string,
});

const API_DISABLED_ERROR = "API is temporarily disabled";

// TODO: Re-enable the Hono RPC client once the API package is healthy again.
export async function getApi() {
  throw new Error(API_DISABLED_ERROR);
}
