import { v } from "convex/values"

import { internalQuery } from "../../_generated/server"

export const getUserByClerkUserId = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", args.clerkUserId)
      )
      .unique()
  },
})

export const getActiveAttributionByUserId = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("creatorAttributions")
      .withIndex("by_userId_active", (query) =>
        query.eq("userId", args.userId).eq("active", true)
      )
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

export const getCreatorAccountById = internalQuery({
  args: {
    creatorAccountId: v.id("creatorAccounts"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.creatorAccountId)
  },
})
