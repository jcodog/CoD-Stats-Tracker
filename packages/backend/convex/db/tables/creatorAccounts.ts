import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorAccounts = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),
  code: v.string(),
  normalizedCode: v.string(),
  codeActive: v.boolean(),
  discountPercent: v.number(),
  payoutPercent: v.number(),
  payoutEligible: v.boolean(),
  stripeConnectedAccountId: v.optional(v.string()),
  detailsSubmitted: v.optional(v.boolean()),
  chargesEnabled: v.optional(v.boolean()),
  payoutsEnabled: v.optional(v.boolean()),
  requirementsDue: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_normalizedCode", ["normalizedCode"])
