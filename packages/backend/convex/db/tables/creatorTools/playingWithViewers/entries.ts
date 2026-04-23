import { defineTable } from "convex/server"
import { v } from "convex/values"
import { participantRankValidator } from "../../../../lib/rankValidator"

export const viewerQueueEntries = defineTable({
  queueId: v.id("viewerQueues"),
  platform: v.optional(v.union(v.literal("discord"), v.literal("twitch"))),
  platformUserId: v.optional(v.string()),

  // Compatibility field for legacy Discord-only queue entries.
  discordUserId: v.optional(v.string()),

  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  linkedUserId: v.optional(v.id("users")),
  rank: participantRankValidator,
  joinedAt: v.number(),
})
  .index("by_queueId", ["queueId"])
  .index("by_queueId_and_joinedAt", ["queueId", "joinedAt"])
  .index("by_queueId_and_platformUserId", [
    "queueId",
    "platform",
    "platformUserId",
  ])
  .index("by_linkedUserId", ["linkedUserId"])
  .index("by_queueId_and_linkedUserId", ["queueId", "linkedUserId"])
