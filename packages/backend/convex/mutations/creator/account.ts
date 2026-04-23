import { v } from "convex/values"

import { mutation } from "../../_generated/server"

export const setCurrentCreatorCodeActiveState = mutation({
  args: {
    codeActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Authentication required.")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!user) {
      throw new Error("User not found.")
    }

    const creatorAccount = await ctx.db
      .query("creatorAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", user._id))
      .unique()

    if (!creatorAccount) {
      throw new Error("Creator account not found.")
    }

    await ctx.db.patch(creatorAccount._id, {
      codeActive: args.codeActive,
      updatedAt: Date.now(),
    })

    return {
      codeActive: args.codeActive,
      creatorAccountId: creatorAccount._id,
    }
  },
})
