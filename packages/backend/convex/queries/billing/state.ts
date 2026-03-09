import { query, QueryCtx } from "../../_generated/server"

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    return null
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique()
}

export const getCurrentUserBillingCustomer = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)

    if (!user) {
      return null
    }

    return await ctx.db
      .query("billingCustomers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique()
  },
})

export const getCurrentUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)

    if (!user) {
      return null
    }

    return await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique()
  },
})

export const getCurrentUserBillingState = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)

    if (!user) {
      return null
    }

    const [customer, subscription] = await Promise.all([
      ctx.db
        .query("billingCustomers")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique(),
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique(),
    ])

    return {
      user,
      customer,
      subscription,
      effectivePlanKey: subscription?.planKey ?? user.plan,
      isSubscribed:
        subscription?.status === "active" ||
        subscription?.status === "trialing",
    }
  },
})
