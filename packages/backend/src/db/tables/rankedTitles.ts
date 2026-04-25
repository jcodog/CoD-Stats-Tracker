import { defineTable } from "convex/server"
import { v } from "convex/values"

export const rankedTitles = defineTable({
  key: v.string(),
  label: v.string(),
  isActive: v.boolean(),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_active_sort", ["isActive", "sortOrder"])
