import { v } from "convex/values"

import { internalQuery } from "../../../_generated/server"

export const getCreatorAccountByUserId = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("creatorAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", args.userId))
      .unique()
  },
})

export const getCreatorAccountByNormalizedCode = internalQuery({
  args: {
    normalizedCode: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("creatorAccounts")
      .withIndex("by_normalizedCode", (query) =>
        query.eq("normalizedCode", args.normalizedCode)
      )
      .unique()
  },
})

export const getCreatorAccountByStripeConnectedAccountId = internalQuery({
  args: {
    stripeConnectedAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("creatorAccounts")
      .withIndex("by_stripeConnectedAccountId", (query) =>
        query.eq("stripeConnectedAccountId", args.stripeConnectedAccountId)
      )
      .unique()
  },
})

export const getCreatorAccountById = internalQuery({
  args: {
    creatorAccountId: v.id("creatorAccounts"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.creatorAccountId)
  },
})
