import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../../drizzle/schema";
import { ENV } from "./env";
import { sendMagicLinkEmail } from "./email";

/**
 * Better-Auth instance (issue #7 / ADR 0006).
 *
 * Replaces the previous Manus OAuth + custom JWT cookie flow with a
 * library-managed session store backed by the `sessions` table. The
 * client interacts with this entirely through `/api/auth/*` HTTP
 * endpoints; there's no manual cookie work in the rest of the app.
 *
 * Phase 1b-ii.1 (this commit) ships email magic-link only. Phase 1b-ii.2
 * adds GitHub OAuth via the same instance's `socialProviders` block.
 */

// Lazy DB construction for the auth adapter — same approach as the
// existing `getDb()` helper in `server/db.ts`. Better-Auth requires a
// concrete drizzle instance at config time, but in test mode we don't
// have one, so we hand it a stub that throws on use. The auth handlers
// are only mounted in dev/prod (see server/_core/index.ts), and tests
// do not exercise them directly.
function getAuthDb() {
  if (!ENV.databaseUrl) {
    return null;
  }
  return drizzle(ENV.databaseUrl, { schema, mode: "default" });
}

const authDb = getAuthDb();

export const auth = authDb
  ? betterAuth({
      database: drizzleAdapter(authDb, {
        provider: "mysql",
        schema: {
          user: schema.users,
          session: schema.sessions,
          account: schema.accounts,
          verification: schema.verifications,
        },
      }),
      // Phase 1b-ii.1: `users.id` is `varchar(255)` so Better-Auth manages
      // ids uniformly across all four auth tables (users / sessions /
      // accounts / verifications). See ADR 0006 + migration 0013.
      baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      // Sessions live for 30 days; refreshed within the last 7 of those.
      session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24 * 7,
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5, // 5 minutes
        },
      },
      // Better-Auth defaults the cookie names to `better-auth.session_token`
      // and `better-auth.session_data`. We let it own those names; the
      // tRPC logout route clears both for defense-in-depth.
      // Production deployments tighten this. Dev allows http://localhost:3000.
      trustedOrigins: ENV.isProduction
        ? [/* set via env in deploy */]
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      plugins: [
        magicLink({
          // 15 minutes per ADR 0005 / Phase 1b-ii spec.
          expiresIn: 60 * 15,
          disableSignUp: false, // anyone with an email can sign in
          sendMagicLink: async ({ email, url }) => {
            await sendMagicLinkEmail({ to: email, magicLinkUrl: url });
          },
        }),
      ],
    })
  : (null as unknown as ReturnType<typeof betterAuth>);

/**
 * Helper used by the tRPC context to resolve the current user from
 * the Better-Auth session cookie. Returns null in test mode where
 * `auth` is itself null.
 */
export async function getSessionUser(req: { headers: any }) {
  if (!auth) return null;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

export type AuthSessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;
