import { v } from "convex/values"

import { internalQuery } from "../../../_generated/server"

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

export const getUsageLockByUserId = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const locks = await ctx.db
      .query("creatorCodeUsageLocks")
      .withIndex("by_userId", (query) => query.eq("userId", args.userId))
      .collect()

    return (
      locks.sort((left, right) => left.createdAt - right.createdAt)[0] ?? null
    )
  },
})
