import { defineTable } from "convex/server"
import { v } from "convex/values"

export const viewerQueues = defineTable({
  creatorUserId: v.id("users"),
  guildId: v.string(),
  channelId: v.string(),
  messageId: v.optional(v.string()),
  title: v.string(),
  creatorDisplayName: v.string(),
  gameLabel: v.string(),
  creatorMessage: v.optional(v.string()),
  rulesText: v.optional(v.string()),
  isActive: v.boolean(),
  playersPerBatch: v.number(),
  matchesPerViewer: v.number(),
  minRank: v.union(
    v.literal("bronze"),
    v.literal("silver"),
    v.literal("gold"),
    v.literal("platinum"),
    v.literal("diamond"),
    v.literal("crimson"),
    v.literal("iridescent"),
    v.literal("top250")
  ),
  maxRank: v.union(
    v.literal("bronze"),
    v.literal("silver"),
    v.literal("gold"),
    v.literal("platinum"),
    v.literal("diamond"),
    v.literal("crimson"),
    v.literal("iridescent"),
    v.literal("top250")
  ),
  inviteMode: v.union(
    v.literal("discord_dm"),
    v.literal("manual_creator_contact")
  ),
  lastSelectedRoundId: v.optional(v.id("viewerQueueRounds")),
  lastMessageSyncError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_creatorUserId", ["creatorUserId"])
  .index("by_guildId_and_channelId", ["guildId", "channelId"])
  .index("by_creatorUserId_and_guildId", ["creatorUserId", "guildId"])
