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
  if (nodeEnv !== "test") {
    if (env.DATABASE_URL === undefined) {
      issues.push("DATABASE_URL: DATABASE_URL is required (set in .env).");
    } else if (env.DATABASE_URL === "") {
      issues.push("DATABASE_URL: DATABASE_URL must not be empty.");
    }
  }

  // --- Email delivery (Phase 1b-ii.1 / ADR 0006) ---
  // Production requires EMAIL_FROM and at least one driver configured.
  // Dev/test can fall back to StdoutDriver (no env needed).
  if (nodeEnv === "production") {
    if (!env.EMAIL_FROM) {
      issues.push(
        "EMAIL_FROM: EMAIL_FROM is required in production (e.g. 'My App <noreply@example.com>')."
      );
    }

    const hasResend = !!env.RESEND_API_KEY;
    const hasSmtp =
      env.EMAIL_PROVIDER === "smtp" &&
      !!env.SMTP_HOST &&
      !!env.SMTP_USER &&
      !!env.SMTP_PASS;
    // Preview / Railway smoke tests: magic-link is printed to logs.
    const hasStdout = env.EMAIL_PROVIDER === "stdout";

    if (!hasResend && !hasSmtp && !hasStdout) {
      issues.push(
        "Email: Production requires either RESEND_API_KEY, EMAIL_PROVIDER=smtp with SMTP_HOST + SMTP_USER + SMTP_PASS, or EMAIL_PROVIDER=stdout (preview only; link appears in logs). See ADR 0006."
      );
    }
  }

  // --- Storage (M1-2) -----------------------------------------------------
  // `local` writes to disk; `s3` targets AWS S3 or any S3-compatible
  // endpoint. Test mode defaults to a per-run temp dir so suites never
  // touch a real bucket or the repo tree.
  const storageDriver = (env.STORAGE_DRIVER ?? "local") as "local" | "s3";
  if (!["local", "s3"].includes(storageDriver)) {
    issues.push(
      `STORAGE_DRIVER: must be "local" or "s3" (got "${env.STORAGE_DRIVER}").`
    );
  }
  if (storageDriver === "s3") {
    if (!env.S3_BUCKET) issues.push("S3_BUCKET: required when STORAGE_DRIVER=s3.");
    if (!env.S3_REGION) issues.push("S3_REGION: required when STORAGE_DRIVER=s3.");
    // Access keys are optional on purpose: AWS deployments may use an
    // instance profile / IRSA instead of static credentials.
  }
  const storageLocalDir =
    env.STORAGE_LOCAL_DIR ??
    (nodeEnv === "test" ? `/tmp/my-raze-test-uploads` : "./data/uploads");

  // --- Billing (M3 / ADR 0004) ----------------------------------------------
  // "free" (default): free-tier caps for everyone, no paid tiers.
  // "none": self-host mode — all features unlocked, no metering.
  // "lemonsqueezy": full subscription billing (requires webhook secret).
  const billingProvider = env.BILLING_PROVIDER ?? "free";
  if (!["free", "none", "lemonsqueezy"].includes(billingProvider)) {
    issues.push(
      `BILLING_PROVIDER: must be "free", "none", or "lemonsqueezy" (got "${env.BILLING_PROVIDER}").`
    );
  }
  if (billingProvider === "lemonsqueezy" && !env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    issues.push(
      "LEMONSQUEEZY_WEBHOOK_SECRET: required when BILLING_PROVIDER=lemonsqueezy (set it in the Lemon Squeezy webhook settings too)."
    );
  }

  // --- Public URL ----------------------------------------------------------
  // Where this deployment is reachable. Magic-link emails and stored file
  // URLs are built from it. Falls back to localhost:PORT for dev.
  const publicUrl =
    env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT || "3000"}`;
  if (nodeEnv === "production" && !env.BETTER_AUTH_URL) {
    issues.push(
      "BETTER_AUTH_URL: required in production (the public URL of this deployment, e.g. https://raze.example.com)."
    );
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return {
    cookieSecret: env.JWT_SECRET!,
    keyEncryptionKey: env.KEY_ENCRYPTION_KEY ?? "",
    databaseUrl: env.DATABASE_URL ?? "",
    isProduction: nodeEnv === "production",
    isTest: nodeEnv === "test",
    publicUrl,
    storageDriver,
    storageLocalDir,
    s3Bucket: env.S3_BUCKET ?? "",
    s3Region: env.S3_REGION ?? "",
    s3Endpoint: env.S3_ENDPOINT ?? "",
    s3AccessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    s3SecretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
  } as const;
}

export const ENV = loadEnv();
