import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorAccounts = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),
  code: v.string(),
  normalizedCode: v.string(),
  country: v.string(),
  codeActive: v.boolean(),
  discountPercent: v.number(),
  payoutPercent: v.number(),
  payoutEligible: v.boolean(),
  stripeConnectedAccountId: v.optional(v.string()),
  stripeConnectedAccountVersion: v.optional(
    v.union(v.literal("v1"), v.literal("v2"))
  ),
  detailsSubmitted: v.optional(v.boolean()),
  chargesEnabled: v.optional(v.boolean()),
  payoutsEnabled: v.optional(v.boolean()),
  connectStatusUpdatedAt: v.optional(v.number()),
  requirementsDue: v.optional(v.array(v.string())),
  requirementsCurrentlyDue: v.optional(v.array(v.string())),
  requirementsPastDue: v.optional(v.array(v.string())),
  requirementsPendingVerification: v.optional(v.array(v.string())),
  requirementsDisabledReason: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_normalizedCode", ["normalizedCode"])
  .index("by_stripeConnectedAccountId", ["stripeConnectedAccountId"])
