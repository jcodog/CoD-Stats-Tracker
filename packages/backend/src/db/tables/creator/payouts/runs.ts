import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorPayoutRuns = defineTable({
  status: v.union(
    v.literal("canceled"),
    v.literal("cancelled"),
    v.literal("completed"),
    v.literal("draft"),
    v.literal("failed"),
    v.literal("executing"),
    v.literal("partial_failed"),
    v.literal("partially_transferred"),
    v.literal("processing"),
    v.literal("requires_review"),
    v.literal("transferred")
  ),
  createdByClerkUserId: v.string(),
  createdByName: v.optional(v.string()),
  createdBySystem: v.optional(v.boolean()),
  source: v.optional(
    v.union(
      v.literal("dry_run_review"),
      v.literal("manual"),
      v.literal("scheduled")
    )
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  executedAt: v.optional(v.number()),
  periodStart: v.optional(v.number()),
  periodEnd: v.optional(v.number()),
  currencyTotals: v.array(
    v.object({
      amount: v.number(),
      currency: v.string(),
    })
  ),
  creatorCount: v.number(),
  transferCount: v.number(),
  blockedGroupCount: v.optional(v.number()),
  skippedLedgerRowCount: v.optional(v.number()),
  failureSummary: v.optional(v.string()),
})
  .index("by_status", ["status"])
  .index("by_createdAt", ["createdAt"])
  .index("by_status_createdAt", ["status", "createdAt"])
  .index("by_periodStart", ["periodStart"])
  .index("by_createdByClerkUserId", ["createdByClerkUserId"])
