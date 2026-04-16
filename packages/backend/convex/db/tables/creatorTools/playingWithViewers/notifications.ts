import { defineTable } from "convex/server"
import { v } from "convex/values"
import { participantRankValidator } from "../../../../lib/rankValidator"
import {
  queueNotificationMethodValidator,
  queueNotificationStatusValidator,
  queuePlatformValidator,
} from "../../../../lib/playingWithViewers"

export const viewerQueueNotifications = defineTable({
  queueId: v.id("viewerQueues"),
  roundId: v.id("viewerQueueRounds"),
  platform: queuePlatformValidator,
  platformUserId: v.string(),
  linkedUserId: v.optional(v.id("users")),
  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  rank: participantRankValidator,
  notificationMethod: queueNotificationMethodValidator,
  notificationStatus: queueNotificationStatusValidator,
  notificationFailureReason: v.optional(v.string()),
  attemptCount: v.number(),
  nextAttemptAt: v.number(),
  lastAttemptAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_roundId", ["roundId"])
  .index("by_roundId_and_platformUserId", [
    "roundId",
    "platform",
    "platformUserId",
  ])
  .index("by_platform_and_status_and_nextAttemptAt", [
    "platform",
    "notificationStatus",
    "nextAttemptAt",
  ])
