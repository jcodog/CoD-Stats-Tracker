import { resolveConfiguredUserRole } from "../../src/lib/staffRoleConfig"
import { query, QueryCtx } from "../_generated/server"
import { buildResolvedBillingState } from "./billing/resolution"
import { hasCreatorWorkspaceAccess } from "../../src/lib/creator/program"

// Server presentation snapshot. Actions and mutations enforce their own access.
export const getViewerAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null
    const role = resolveConfiguredUserRole({
      discordId: user.discordId,
      role: user.role ?? null,
    })
    const billing = await buildResolvedBillingState(ctx, user)
    return {
      role,
      plan: billing.appPlanKey,
      hasCreatorAccess: hasCreatorWorkspaceAccess({
        state: billing,
        userRole: role,
        fallbackPlanKey:
          billing.accessSource === "legacy_plan" ? user.plan : undefined,
      }),
    }
  },
})

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)

    if (!user) {
      return null
    }

    const resolvedRole = resolveConfiguredUserRole({
      discordId: user.discordId,
      role: user.role ?? null,
    })

    return {
      ...user,
      role: resolvedRole ?? undefined,
    }
  },
})

export const getCurrentUser = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) {
    return null
  }

  return await userByClerkUserId(ctx, identity.subject)
}

const userByClerkUserId = async (ctx: QueryCtx, clerkUserId: string) => {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique()
}
