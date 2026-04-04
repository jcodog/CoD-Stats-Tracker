import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

import { getClerkPublishableKeyFrontendApiHost } from "@/lib/auth/clerk-publishable-key"

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

function validateClerkPublishableKey(publishableKey: string) {
  const frontendApiHost =
    getClerkPublishableKeyFrontendApiHost(publishableKey)

  if (frontendApiHost?.endsWith(".cleoai.cloud")) {
    return `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY still points at the legacy Clerk Frontend API host "${frontendApiHost}". Rotate the publishable key so it resolves to clerk.codstats.tech before deploying.`
  }

  return null
}

export const env = createEnv({
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().min(1),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
      .string()
      .min(1)
      .superRefine((value, ctx) => {
        const validationMessage = validateClerkPublishableKey(value)

        if (validationMessage) {
          ctx.addIssue({
            code: "custom",
            message: validationMessage,
          })
        }
      }),
    NEXT_PUBLIC_CHATGPT_APP_CONNECT_URL: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_DATABUDDY_CLIENT_ID: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CHATGPT_APP_CONNECT_URL:
      process.env.NEXT_PUBLIC_CHATGPT_APP_CONNECT_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_DATABUDDY_CLIENT_ID:
      process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID,
  },
  emptyStringAsUndefined: true,
  onValidationError: (issues) => {
    throw new Error(
      `Invalid client environment variables: ${formatValidationIssues(issues)}`
    )
  },
})
