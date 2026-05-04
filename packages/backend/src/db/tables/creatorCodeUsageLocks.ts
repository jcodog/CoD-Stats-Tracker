import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorCodeUsageLocks = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),
  creatorAccountId: v.id("creatorAccounts"),
  creatorCode: v.string(),
  normalizedCode: v.string(),
  source: v.union(v.literal("cookie"), v.literal("manual"), v.literal("staff")),

  discountPercent: v.number(),
  payoutPercent: v.number(),

  stripeCustomerId: v.optional(v.string()),
  stripeCheckoutSessionId: v.optional(v.string()),
  checkoutSessionCreatedAt: v.optional(v.number()),
  discountAppliedAt: v.optional(v.number()),

  stripeSubscriptionId: v.optional(v.string()),
  subscriptionBoundAt: v.optional(v.number()),
  attributionStartedAt: v.optional(v.number()),
  payoutEligibilityEndsAt: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_creatorAccountId", ["creatorAccountId"])
  .index("by_normalizedCode", ["normalizedCode"])
  .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"])
  .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
