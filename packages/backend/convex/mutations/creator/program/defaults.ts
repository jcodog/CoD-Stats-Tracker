import { v } from "convex/values"

import { internalMutation } from "../../../_generated/server"
import { CREATOR_PROGRAM_DEFAULTS_KEY } from "../../../../src/lib/creator/program"

export const upsertCreatorProgramDefaults = internalMutation({
  args: {
    defaultCodeActive: v.boolean(),
    defaultCountry: v.string(),
    defaultDiscountPercent: v.number(),
    defaultPayoutEligible: v.boolean(),
    defaultPayoutPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const existingDefaults = await ctx.db
      .query("creatorProgramDefaults")
      .withIndex("by_key", (query) =>
        query.eq("key", CREATOR_PROGRAM_DEFAULTS_KEY)
      )
      .unique()
    const now = Date.now()

    if (!existingDefaults) {
      const defaultsId = await ctx.db.insert("creatorProgramDefaults", {
        ...args,
        createdAt: now,
        key: CREATOR_PROGRAM_DEFAULTS_KEY,
        updatedAt: now,
      })

      return await ctx.db.get(defaultsId)
    }

    await ctx.db.patch(existingDefaults._id, {
      ...args,
      updatedAt: now,
    })

    return await ctx.db.get(existingDefaults._id)
  },
})
