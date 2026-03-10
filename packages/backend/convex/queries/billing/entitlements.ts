import { v } from "convex/values"

import { query } from "../../_generated/server"
import { buildResolvedBillingState } from "./resolution"

export const getCurrentUserEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return []
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) => query.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return []
    }

    return (await buildResolvedBillingState(ctx, user)).effectiveFeatures
  },
})

export const currentUserHasFeature = query({
  args: {
    featureKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return false
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) => query.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return false
    }

    const state = await buildResolvedBillingState(ctx, user)

    return state.effectiveFeatures.some((feature) => feature.key === args.featureKey)
  },
})
