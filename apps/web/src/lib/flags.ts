import "server-only"

import { flag, dedupe } from "flags/next"
import { vercelAdapter } from "@flags-sdk/vercel"
import { cache } from "react"
import { getViewer } from "@/lib/server/viewer"
import { fetchQuery } from "convex/nextjs"
import { api } from "@workspace/backend/convex/_generated/api"
import type { UserRole } from "@workspace/backend/lib/staffRoles"

export type Plan = "free" | "premium" | "creator"
export type Role = UserRole

type FlagEntities = {
  user?: {
    id: string
    plan: Plan
    role: Role
    email?: string
  }
}

const identify = dedupe(async (): Promise<FlagEntities> => {
  const { userId, clerkUser, access } = await getViewer()
  if (!userId || !access) return {}
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress
  const role: Role = access.role ?? "user"
  const resolvedPlan: Plan = access.plan
  return {
    user: {
      id: userId,
      plan: resolvedPlan,
      role,
      email,
    },
  }
})

function makeBooleanFlag(key: string, description?: string) {
  return flag<boolean, FlagEntities>({
    key,
    adapter: vercelAdapter(),
    defaultValue: false,
    description,
    identify,
    options: [
      { value: true, label: "Enabled" },
      { value: false, label: "Disabled" },
    ],
  })
}

export const presentationFlags = {
  overlays: makeBooleanFlag(
    "overlays",
    "Enable the user to use the overlays configurator"
  ),
} as const

export const flags = {
  ...presentationFlags,
  checkout: cache(async () => {
    try {
      return await fetchQuery(
        api.queries.billing.catalog.getCheckoutAvailability,
        {}
      )
    } catch {
      return false
    }
  }),
} as const

export type AppFlagKey = keyof typeof flags

export async function isFlagEnabled(flagKey: AppFlagKey) {
  return flags[flagKey]()
}
