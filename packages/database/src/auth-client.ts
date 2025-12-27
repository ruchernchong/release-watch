import { passkeyClient } from "@better-auth/passkey/client";
import { polarClient } from "@polar-sh/better-auth";
import {
  adminClient,
  jwtClient,
  lastLoginMethodClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    jwtClient(),
    lastLoginMethodClient(),
    passkeyClient(),
    polarClient(),
  ],
});
