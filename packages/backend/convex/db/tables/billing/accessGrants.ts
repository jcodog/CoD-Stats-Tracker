import { defineTable } from "convex/server"
import { v } from "convex/values"

export const billingAccessGrants = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),

  planKey: v.string(),
  source: v.union(
    v.literal("creator_approval"),
    v.literal("manual"),
    v.literal("promo")
  ),

  active: v.boolean(),
  reason: v.string(),

  startsAt: v.optional(v.number()),
  endsAt: v.optional(v.number()),

  grantedByClerkUserId: v.optional(v.string()),
  grantedByName: v.optional(v.string()),
  revokedAt: v.optional(v.number()),
  revokedByClerkUserId: v.optional(v.string()),
  revokedByName: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_userId_active", ["userId", "active"])
  .index("by_planKey_active", ["planKey", "active"])
