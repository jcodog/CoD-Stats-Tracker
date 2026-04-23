import { v } from "convex/values"

import { internalMutation } from "../../_generated/server"

export const ensureCanonicalAttribution = internalMutation({
  args: {
    clerkUserId: v.string(),
    creatorAccountId: v.id("creatorAccounts"),
    creatorCode: v.string(),
    normalizedCode: v.string(),
    source: v.union(v.literal("cookie"), v.literal("manual"), v.literal("staff")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingAttribution = await ctx.db
      .query("creatorAttributions")
      .withIndex("by_userId_active", (query) =>
        query.eq("userId", args.userId).eq("active", true)
      )
      .unique()

    if (!existingAttribution) {
      const now = Date.now()

      await ctx.db.insert("creatorAttributions", {
        active: true,
        clerkUserId: args.clerkUserId,
        createdAt: now,
        creatorAccountId: args.creatorAccountId,
        creatorCode: args.creatorCode,
        normalizedCode: args.normalizedCode,
        source: args.source,
        updatedAt: now,
        userId: args.userId,
      })

      return {
        status: "applied" as const,
      }
    }

    if (existingAttribution.normalizedCode === args.normalizedCode) {
      return {
        status: "confirmed_existing" as const,
      }
    }

    return {
      existingCode: existingAttribution.creatorCode,
      status: "conflict_locked" as const,
    }
  },
})
