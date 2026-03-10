import { query } from "../../_generated/server"
import { buildResolvedBillingState } from "./resolution"

export const getCurrentUserBillingCustomer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) => query.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return null
    }

    return await ctx.db
      .query("billingCustomers")
      .withIndex("by_userId", (query) => query.eq("userId", user._id))
      .unique()
  },
})

export const getCurrentUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) => query.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return null
    }

    return (await buildResolvedBillingState(ctx, user)).subscription
  },
})

export const getCurrentUserBillingState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) => query.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return null
    }

    return await buildResolvedBillingState(ctx, user)
  },
})
