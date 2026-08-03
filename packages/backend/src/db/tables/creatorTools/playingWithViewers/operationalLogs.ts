import { defineTable } from "convex/server"
import { v } from "convex/values"

export const viewerQueueOperationalLogs = defineTable({
  eventType: v.string(),
  severity: v.union(v.literal("info"), v.literal("warning")),
  queueId: v.id("viewerQueues"),
  roundId: v.id("viewerQueueRounds"),
  notificationId: v.id("viewerQueueNotifications"),
  platformUserId: v.string(),
  displayName: v.optional(v.string()),
  username: v.optional(v.string()),
  discordHttpStatus: v.optional(v.number()),
  discordApiCode: v.optional(v.number()),
  discordApiMessage: v.optional(v.string()),
  internalErrorMessage: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_eventType_timestamp", ["eventType", "timestamp"])
  .index("by_queueId_timestamp", ["queueId", "timestamp"])
  .index("by_roundId_timestamp", ["roundId", "timestamp"])
