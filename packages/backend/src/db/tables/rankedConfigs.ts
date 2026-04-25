import { defineTable } from "convex/server"
import { v } from "convex/values"

export const rankedConfigs = defineTable({
  key: v.literal("current"),
  activeTitleKey: v.string(),
  activeSeason: v.number(),
  sessionWritesEnabled: v.optional(v.boolean()),
  updatedAt: v.number(),
  updatedByUserId: v.id("users"),
}).index("by_key", ["key"])
