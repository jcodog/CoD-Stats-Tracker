import { defineTable } from "convex/server"
import { v } from "convex/values"

export const activisionUsernames = defineTable({
  ownerUserId: v.id("users"),
  displayUsername: v.string(),
  normalizedUsername: v.string(),
  isPrimary: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastUsedAt: v.number(),
})
  .index("by_owner", ["ownerUserId"])
  .index("by_owner_normalized", ["ownerUserId", "normalizedUsername"])
