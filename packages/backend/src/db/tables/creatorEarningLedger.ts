import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorEarningLedger = defineTable({
  idempotencyKey: v.string(),

  creatorAccountId: v.id("creatorAccounts"),
  creatorCode: v.string(),
  normalizedCode: v.string(),
  usageLockId: v.id("creatorCodeUsageLocks"),
  userId: v.id("users"),
  clerkUserId: v.string(),

  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(),
  stripeInvoiceId: v.string(),
  stripePaymentIntentId: v.optional(v.string()),

  attributionStartedAt: v.number(),
  payoutEligibilityEndsAt: v.number(),
  invoiceIssuedAt: v.number(),
  invoiceStatus: v.string(),
  invoiceAmountPaid: v.number(),
  invoiceAmountTotal: v.optional(v.number()),
  currency: v.string(),

  payoutPercent: v.number(),
  earningAmount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("eligible"),
    v.literal("void"),
    v.literal("reversed"),
    v.literal("future_transfer_pending")
  ),

  lastSyncedAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_idempotencyKey", ["idempotencyKey"])
  .index("by_stripeInvoiceId", ["stripeInvoiceId"])
  .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
  .index("by_creatorAccountId", ["creatorAccountId"])
  .index("by_usageLockId", ["usageLockId"])
  .index("by_status", ["status"])
