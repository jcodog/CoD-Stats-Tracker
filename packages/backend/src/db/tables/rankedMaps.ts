import { defineTable } from "convex/server"
import { v } from "convex/values"

export const rankedMaps = defineTable({
  titleKey: v.string(),
  name: v.string(),
  normalizedName: v.string(),
  supportedModeIds: v.optional(v.array(v.id("rankedModes"))),
  isActive: v.boolean(),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_title", ["titleKey"])
  .index("by_title_normalized", ["titleKey", "normalizedName"])
  .index("by_title_active_sort", ["titleKey", "isActive", "sortOrder"])
