import { defineTable } from "convex/server"
import { v } from "convex/values"

export const rankedModes = defineTable({
  titleKey: v.string(),
  key: v.string(),
  label: v.string(),
  isActive: v.boolean(),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_title", ["titleKey"])
  .index("by_title_key", ["titleKey", "key"])
  .index("by_title_active_sort", ["titleKey", "isActive", "sortOrder"])
