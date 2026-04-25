import { defineTable } from "convex/server"
import { v } from "convex/values"

export const viewerQueueMessageSyncs = defineTable({
  queueId: v.id("viewerQueues"),
  operation: v.union(
    v.literal("publish"),
    v.literal("update"),
    v.literal("disable")
  ),
  status: v.union(v.literal("success"), v.literal("failed")),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
})
