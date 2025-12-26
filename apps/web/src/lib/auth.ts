import { auth } from "@release-watch/database";
import { headers } from "next/headers";

export { auth } from "@release-watch/database";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
