import { v } from "convex/values"

import { query } from "../../_generated/server"

export const getPublicCreatorCodeSummary = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase()
    const creatorAccount = await ctx.db
      .query("creatorAccounts")
      .withIndex("by_normalizedCode", (query) =>
        query.eq("normalizedCode", normalizedCode)
      )
      .unique()

    if (!creatorAccount || !creatorAccount.codeActive) {
      return null
    }

    return {
      code: creatorAccount.code,
      discountPercent: creatorAccount.discountPercent,
    }
  },
})

export const getCurrentUserAttribution = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!user) {
      return null
    }

    const attribution = await ctx.db
      .query("creatorAttributions")
      .withIndex("by_userId_active", (query) =>
        query.eq("userId", user._id).eq("active", true)
      )
      .unique()

    if (!attribution) {
      return null
    }

    const creatorAccount = await ctx.db.get(attribution.creatorAccountId)

    if (!creatorAccount) {
      return null
    }

    return {
      code: attribution.creatorCode,
      creatorAccountId: attribution.creatorAccountId,
      discountPercent: creatorAccount.discountPercent,
      locked: true,
      source: attribution.source,
    }
  },
})
