import { defineTable } from "convex/server"
import { v } from "convex/values"

export const rankedConfigs = defineTable({
  key: v.literal("current"),
  activeTitleKey: v.string(),
  activeSeason: v.number(),
  sessionWritesEnabled: v.optional(v.boolean()),
  rollover: v.optional(
    v.object({
      status: v.union(v.literal("running"), v.literal("complete")),
      targetTitleKey: v.string(),
      targetSeason: v.number(),
      targetWritesEnabled: v.boolean(),
      startedAt: v.number(),
      archivedSessionCount: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  updatedAt: v.number(),
  updatedByUserId: v.id("users"),
}).index("by_key", ["key"])
