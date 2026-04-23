import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorAttributions = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),
  creatorAccountId: v.id("creatorAccounts"),
  creatorCode: v.string(),
  normalizedCode: v.string(),
  source: v.union(v.literal("cookie"), v.literal("manual"), v.literal("staff")),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  overriddenAt: v.optional(v.number()),
  overrideReason: v.optional(v.string()),
})
  .index("by_userId", ["userId"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_userId_active", ["userId", "active"])
  .index("by_creatorAccountId", ["creatorAccountId"])
  .index("by_normalizedCode", ["normalizedCode"])
