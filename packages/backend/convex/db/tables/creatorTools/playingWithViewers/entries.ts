import { defineTable } from "convex/server"
import { v } from "convex/values"
import { rankValidator } from "../../../../lib/rankValidator"

export const viewerQueueEntries = defineTable({
  queueId: v.id("viewerQueues"),
  platform: v.union(v.literal("discord"), v.literal("twitch")),
  platformUserId: v.string(),

  // Compatibility field for existing Discord code paths.
  discordUserId: v.optional(v.string()),

  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  linkedUserId: v.optional(v.id("users")),
  rank: rankValidator,
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
