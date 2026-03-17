import { defineTable } from "convex/server"
import { v } from "convex/values"

export const viewerQueueRounds = defineTable({
  queueId: v.id("viewerQueues"),
  mode: v.union(v.literal("discord_dm"), v.literal("manual_creator_contact")),
  lobbyCode: v.optional(v.string()),
  selectedUsers: v.array(
    v.object({
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
      dmStatus: v.optional(v.union(v.literal("sent"), v.literal("failed"))),
      dmFailureReason: v.optional(v.string()),
    })
  ),
  selectedCount: v.number(),
  createdAt: v.number(),
})
  .index("by_queueId", ["queueId"])
  .index("by_queueId_and_createdAt", ["queueId", "createdAt"])
