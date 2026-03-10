import { v } from "convex/values"

import { internalQuery } from "../../_generated/server"

export const getByKey = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (query) => query.eq("key", args.key))
      .unique()
  },
})
