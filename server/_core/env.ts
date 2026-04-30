/**
 * Environment-variable validation. Runs at module load.
 *
 * If validation fails the module throws `EnvValidationError` with a multi-line
 * message describing every problem. The server bootstrap lets the throw
 * propagate so the process exits before any request is served — see issue #6.
 *
 * Tests preload required vars in `vitest.setup.ts` so importing this module
 * inside the test runner never throws.
 */

const NODE_ENVS = ["development", "test", "production"] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

export class EnvValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(
      "Invalid environment configuration:\n" +
        issues.map(i => `  - ${i}`).join("\n") +
        "\n\nSee .env.example for the full schema."
    );
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

function loadEnv() {
  const issues: string[] = [];
  const env = process.env;

  // --- Required: JWT_SECRET ---
  if (!env.JWT_SECRET) {
    issues.push(
      "JWT_SECRET: JWT_SECRET is required. Generate with `openssl rand -hex 32` and set it in .env."
    );
  } else if (env.JWT_SECRET.length < 32) {
    issues.push(
      "JWT_SECRET: JWT_SECRET must be at least 32 characters. Generate with `openssl rand -hex 32`."
    );
  }

  // --- Required outside test: KEY_ENCRYPTION_KEY (Phase 1b-i / issue #2) ---
  // Master secret for encrypting per-user BYOK API keys. Same generation
  // recipe as JWT_SECRET; the two MUST be different values in production.
  if ((env.NODE_ENV ?? "development") !== "test") {
    if (!env.KEY_ENCRYPTION_KEY) {
      issues.push(
        "KEY_ENCRYPTION_KEY: KEY_ENCRYPTION_KEY is required (encrypts per-user BYOK API keys at rest). Generate with `openssl rand -hex 32` and set it in .env."
      );
    } else if (env.KEY_ENCRYPTION_KEY.length < 32) {
      issues.push(
        "KEY_ENCRYPTION_KEY: KEY_ENCRYPTION_KEY must be at least 32 characters."
      );
    } else if (env.KEY_ENCRYPTION_KEY === env.JWT_SECRET) {
      issues.push(
        "KEY_ENCRYPTION_KEY: KEY_ENCRYPTION_KEY must NOT equal JWT_SECRET. Generate two distinct secrets."
      );
    }
  }

  // --- NODE_ENV must be a known value (or absent → defaults) ---
  const nodeEnv = (env.NODE_ENV ?? "development") as NodeEnv;
  if (!NODE_ENVS.includes(nodeEnv)) {
    issues.push(
      `NODE_ENV: NODE_ENV must be one of ${NODE_ENVS.join(", ")} (got "${env.NODE_ENV}").`
    );
  }

  // --- DATABASE_URL: required in dev/prod; relaxed in test ---
  // Test mode preserves the v3.0 silent-no-op behavior of `db.ts` so the
  // pre-existing test suite (which never set DATABASE_URL and passed by
  // accident — see diagnosis) keeps working until Phase 4 moves it to
  // testcontainers. Outside `NODE_ENV=test` we fail fast.
  if (nodeEnv !== "test") {
    if (env.DATABASE_URL === undefined) {
      issues.push("DATABASE_URL: DATABASE_URL is required (set in .env).");
    } else if (env.DATABASE_URL === "") {
      issues.push("DATABASE_URL: DATABASE_URL must not be empty.");
    }
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return {
    appId: env.VITE_APP_ID ?? "",
    cookieSecret: env.JWT_SECRET!,
    keyEncryptionKey: env.KEY_ENCRYPTION_KEY ?? "",
    databaseUrl: env.DATABASE_URL ?? "",
    oAuthServerUrl: env.OAUTH_SERVER_URL ?? "",
    ownerOpenId: env.OWNER_OPEN_ID ?? "",
    isProduction: nodeEnv === "production",
    isTest: nodeEnv === "test",
    forgeApiUrl: env.BUILT_IN_FORGE_API_URL ?? "",
    forgeApiKey: env.BUILT_IN_FORGE_API_KEY ?? "",
  } as const;
}

export const ENV = loadEnv();
