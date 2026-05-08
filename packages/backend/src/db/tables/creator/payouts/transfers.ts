import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorPayoutTransfers = defineTable({
  payoutRunId: v.id("creatorPayoutRuns"),
  creatorAccountId: v.id("creatorAccounts"),
  stripeConnectedAccountId: v.string(),
  creatorCode: v.string(),
  currency: v.string(),
  amount: v.number(),
  ledgerEntryIds: v.array(v.id("creatorEarningLedger")),
  status: v.union(
    v.literal("cancelled"),
    v.literal("draft"),
    v.literal("failed"),
    v.literal("requires_review"),
    v.literal("transferred"),
    v.literal("transferring")
  ),
  stripeTransferId: v.optional(v.string()),
  idempotencyKey: v.string(),
  source: v.optional(
    v.union(
      v.literal("dry_run_review"),
      v.literal("manual_retry"),
      v.literal("scheduled")
    )
  ),
  failureCode: v.optional(v.string()),
  failureMessage: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  transferredAt: v.optional(v.number()),
})
  .index("by_payoutRunId", ["payoutRunId"])
  .index("by_creatorAccountId", ["creatorAccountId"])
  .index("by_status", ["status"])
  .index("by_status_updatedAt", ["status", "updatedAt"])
  .index("by_updatedAt", ["updatedAt"])
  .index("by_idempotencyKey", ["idempotencyKey"])
  .index("by_stripeTransferId", ["stripeTransferId"])
