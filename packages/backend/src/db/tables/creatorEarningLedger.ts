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
    v.literal("future_transfer_pending"),
    v.literal("reserved"),
    v.literal("transferred"),
    v.literal("transfer_failed"),
    v.literal("transfer_requires_review")
  ),
  payoutRunId: v.optional(v.id("creatorPayoutRuns")),
  payoutTransferId: v.optional(v.id("creatorPayoutTransfers")),
  stripeTransferId: v.optional(v.string()),
  transferStatus: v.optional(
    v.union(
      v.literal("cancelled"),
      v.literal("draft"),
      v.literal("failed"),
      v.literal("requires_review"),
      v.literal("transferred"),
      v.literal("transferring")
    )
  ),
  transferredAt: v.optional(v.number()),

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
  .index("by_status_invoiceIssuedAt", ["status", "invoiceIssuedAt"])
  .index("by_creatorAccountId_invoiceIssuedAt", [
    "creatorAccountId",
    "invoiceIssuedAt",
  ])
  .index("by_payoutRunId", ["payoutRunId"])
  .index("by_payoutTransferId", ["payoutTransferId"])
