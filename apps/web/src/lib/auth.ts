import { auth } from "@shipradar/database";
import { headers } from "next/headers";

export { auth } from "@shipradar/database";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
