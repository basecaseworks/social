import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

function getTrustedOrigins() {
  const origins = [
    process.env.BETTER_AUTH_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
  ]
    .map((origin) => origin?.trim() ?? "")
    .filter((origin) => origin.length > 0);

  return [...new Set(origins)];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: getTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});

export async function getAuthenticatedUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
}
