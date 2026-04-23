import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

function formatValidationIssues(
  issues: readonly { message: string; path?: ReadonlyArray<unknown> }[]
) {
  return issues
    .map((issue) => {
      const path = issue.path?.length
        ? `${issue.path.map((segment) => String(segment)).join(".")}: `
        : ""
      return `${path}${issue.message}`
    })
    .join("; ")
}

function createConvexEnv() {
  return createEnv({
    server: {
      CLERK_JWT_ISSUER_URL: z.string().optional(),
      CLERK_SECRET_KEY: z.string().optional(),
      CLERK_WEBHOOK_SECRET: z.string().optional(),
      CONVEX_DEPLOYMENT: z.string().optional(),
      DISCORD_APPLICATION_ID: z.string().optional(),
      DISCORD_APPLICATION_PUBLIC_KEY: z.string().optional(),
      DISCORD_BOT_TOKEN: z.string().optional(),
      DISCORD_DEV_GUILD_ID: z.string().optional(),
      KV_URL: z.string().optional(),
      REDIS_TLS_URL: z.string().optional(),
      REDIS_URL: z.string().optional(),
      STRIPE_SECRET_KEY: z.string().optional(),
      STRIPE_WEBHOOK_SECRET: z.string().optional(),
      SUPER_ADMIN_DISCORD_ID: z.string().optional(),
      SUPER_ADMIN_DISCORD_IDS: z.string().optional(),
      TWITCH_CONVEX_ADMIN_KEY: z.string().optional(),
      VERCEL_ACCESS_TOKEN: z.string().optional(),
      VERCEL_PROJECT_ID_OR_NAME: z.string().optional(),
      VERCEL_TEAM_ID: z.string().optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      throw new Error(
        `Invalid Convex environment variables: ${formatValidationIssues(issues)}`
      )
    },
  })
}

function createConvexAuthEnv() {
  return createEnv({
    server: {
      CLERK_JWT_ISSUER_URL: z.string().optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      throw new Error(
        `Invalid Convex auth environment variables: ${formatValidationIssues(issues)}`
      )
    },
  })
}

let cachedConvexEnv: ReturnType<typeof createConvexEnv> | null = null
let cachedConvexAuthEnv: ReturnType<typeof createConvexAuthEnv> | null = null

export type ConvexEnv = ReturnType<typeof createConvexEnv>
export type ConvexAuthEnv = ReturnType<typeof createConvexAuthEnv>

export function getConvexEnv() {
  if (!cachedConvexEnv) {
    cachedConvexEnv = createConvexEnv()
  }

  return cachedConvexEnv
}

export function getConvexAuthEnv() {
  if (!cachedConvexAuthEnv) {
    cachedConvexAuthEnv = createConvexAuthEnv()
  }

  return cachedConvexAuthEnv
}

export function resetConvexEnvForTests() {
  cachedConvexEnv = null
  cachedConvexAuthEnv = null
}
