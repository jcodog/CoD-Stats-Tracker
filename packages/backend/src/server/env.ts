import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).optional();

function formatValidationIssues(
  issues: readonly { message: string; path?: ReadonlyArray<unknown> }[],
) {
  return issues
    .map((issue) => {
      const path = issue.path?.length
        ? `${issue.path.map((segment) => String(segment)).join(".")}: `
        : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

function createServerEnv() {
  return createEnv({
    shared: {
      NODE_ENV: nodeEnvSchema,
    },
    server: {
      APP_PUBLIC_ORIGIN: z.string().optional(),
      LANDING_METRICS_API_KEY: z.string().optional(),
      LANDING_METRICS_REQUIRE_API_KEY: z.string().optional(),
      OAUTH_ALLOWED_REDIRECT_URIS: z.string().optional(),
      OAUTH_ALLOWED_SCOPES: z.string().optional(),
      OAUTH_AUDIENCE: z.string().optional(),
      OAUTH_CLIENT_ID: z.string().optional(),
      OAUTH_CLIENT_SECRET: z.string().optional(),
      OAUTH_ISSUER: z.string().optional(),
      OAUTH_JWT_SECRET: z.string().optional(),
      OAUTH_RESOURCE: z.string().optional(),
      OAUTH_RESOURCE_DOCUMENTATION: z.string().optional(),
      KV_URL: z.string().optional(),
      REDIS_TLS_URL: z.string().optional(),
      REDIS_URL: z.string().optional(),
    },
    runtimeEnv: {
      APP_PUBLIC_ORIGIN: process.env.APP_PUBLIC_ORIGIN,
      LANDING_METRICS_API_KEY: process.env.LANDING_METRICS_API_KEY,
      LANDING_METRICS_REQUIRE_API_KEY:
        process.env.LANDING_METRICS_REQUIRE_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      OAUTH_ALLOWED_REDIRECT_URIS: process.env.OAUTH_ALLOWED_REDIRECT_URIS,
      OAUTH_ALLOWED_SCOPES: process.env.OAUTH_ALLOWED_SCOPES,
      OAUTH_AUDIENCE: process.env.OAUTH_AUDIENCE,
      OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
      OAUTH_ISSUER: process.env.OAUTH_ISSUER,
      OAUTH_JWT_SECRET: process.env.OAUTH_JWT_SECRET,
      OAUTH_RESOURCE: process.env.OAUTH_RESOURCE,
      OAUTH_RESOURCE_DOCUMENTATION: process.env.OAUTH_RESOURCE_DOCUMENTATION,
      KV_URL: process.env.KV_URL,
      REDIS_TLS_URL: process.env.REDIS_TLS_URL,
      REDIS_URL: process.env.REDIS_URL,
    },
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      throw new Error(
        `Invalid server environment variables: ${formatValidationIssues(issues)}`,
      );
    },
  });
}

let cachedServerEnv: ReturnType<typeof createServerEnv> | null = null;

export type ServerEnv = ReturnType<typeof createServerEnv>;

export function getServerEnv() {
  if (!cachedServerEnv) {
    cachedServerEnv = createServerEnv();
  }

  return cachedServerEnv;
}

export function resetServerEnvForTests() {
  cachedServerEnv = null;
}
