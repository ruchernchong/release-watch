import { authClient } from "@release-watch/database/auth-client";

export { authClient };

export const { signIn, signOut, useSession, admin } = authClient;
