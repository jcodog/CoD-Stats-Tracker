import { defineTable } from "convex/server"
import { v } from "convex/values"
import { competitiveRankValidator } from "../../../../../src/lib/rankValidator"
import { storedInviteModeValidator } from "../../../../../src/lib/playingWithViewers"

export const viewerQueues = defineTable({
  creatorUserId: v.id("users"),

  guildId: v.string(),
  guildName: v.optional(v.string()),
  channelId: v.string(),
  channelName: v.optional(v.string()),
  channelPermsCorrect: v.optional(v.boolean()),
  messageId: v.optional(v.string()),

  twitchBroadcasterId: v.optional(v.string()),
  twitchBroadcasterLogin: v.optional(v.string()),
  twitchCommandsEnabled: v.optional(v.boolean()),
  twitchBotAnnouncementsEnabled: v.optional(v.boolean()),

  title: v.string(),
  creatorDisplayName: v.string(),
  gameLabel: v.string(),
  creatorMessage: v.optional(v.string()),
  rulesText: v.optional(v.string()),
  isActive: v.boolean(),
  playersPerBatch: v.number(),
  matchesPerViewer: v.number(),
  minRank: competitiveRankValidator,
  maxRank: competitiveRankValidator,
  inviteMode: storedInviteModeValidator,
  lastSelectedRoundId: v.optional(v.id("viewerQueueRounds")),
  lastMessageSyncError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_creatorUserId", ["creatorUserId"])
  .index("by_isActive", ["isActive"])
  .index("by_guildId_and_channelId", ["guildId", "channelId"])
  .index("by_creatorUserId_and_guildId", ["creatorUserId", "guildId"])
  .index("by_twitchBroadcasterId", ["twitchBroadcasterId"])
