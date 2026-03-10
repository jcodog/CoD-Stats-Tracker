import { defineTable } from "convex/server"
import { v } from "convex/values"

export const billingWebhookEvents = defineTable({
  stripeEventId: v.string(),
  eventType: v.string(),

  receivedAt: v.number(),
  processedAt: v.optional(v.number()),
  processingStatus: v.union(
    v.literal("received"),
    v.literal("processing"),
    v.literal("processed"),
    v.literal("ignored"),
    v.literal("failed")
  ),

  errorMessage: v.optional(v.string()),

  customerId: v.optional(v.string()),
  subscriptionId: v.optional(v.string()),
  invoiceId: v.optional(v.string()),
  paymentIntentId: v.optional(v.string()),

  safeSummary: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_stripeEventId", ["stripeEventId"])
  .index("by_receivedAt", ["receivedAt"])
  .index("by_processingStatus_receivedAt", ["processingStatus", "receivedAt"])
  .index("by_eventType_receivedAt", ["eventType", "receivedAt"])
