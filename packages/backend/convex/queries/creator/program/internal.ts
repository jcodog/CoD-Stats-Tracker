import { internalQuery } from "../../../_generated/server"

export const getCreatorProgramDefaults = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("creatorProgramDefaults")
      .withIndex("by_key", (query) => query.eq("key", "global"))
      .unique()
  },
})
