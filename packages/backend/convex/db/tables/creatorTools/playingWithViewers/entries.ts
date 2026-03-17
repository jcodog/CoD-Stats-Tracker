import { defineTable } from "convex/server"
import { v } from "convex/values"

export const viewerQueueEntries = defineTable({
  queueId: v.id("viewerQueues"),
  discordUserId: v.string(),
  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  rank: v.union(
    v.literal("bronze"),
    v.literal("silver"),
    v.literal("gold"),
    v.literal("platinum"),
    v.literal("diamond"),
    v.literal("crimson"),
    v.literal("iridescent"),
    v.literal("top250")
  ),
  joinedAt: v.number(),
})
  .index("by_queueId", ["queueId"])
  .index("by_queueId_and_joinedAt", ["queueId", "joinedAt"])
  .index("by_queueId_and_discordUserId", ["queueId", "discordUserId"])
