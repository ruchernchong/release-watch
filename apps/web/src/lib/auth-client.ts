import { authClient } from "@shipradar/database/auth-client";

export { authClient };

export const { signIn, signOut, useSession, admin } = authClient;
