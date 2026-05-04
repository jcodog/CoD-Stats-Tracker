import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorPayoutRuns = defineTable({
  status: v.union(
    v.literal("cancelled"),
    v.literal("draft"),
    v.literal("executing"),
    v.literal("partially_transferred"),
    v.literal("requires_review"),
    v.literal("transferred")
  ),
  createdByClerkUserId: v.string(),
  createdByName: v.optional(v.string()),
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
  failureSummary: v.optional(v.string()),
})
  .index("by_status", ["status"])
  .index("by_createdAt", ["createdAt"])
  .index("by_createdByClerkUserId", ["createdByClerkUserId"])
