import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  participantRankValidator,
} from "../../../../lib/rankValidator"
import {
  queueNotificationMethodValidator,
  queueNotificationStatusValidator,
} from "../../../../lib/playingWithViewers"

export const viewerQueueRounds = defineTable({
  queueId: v.id("viewerQueues"),
  mode: v.union(v.literal("bot_dm"), v.literal("manual_creator_contact")),
  lobbyCode: v.optional(v.string()),
  inviteCodeType: v.optional(
    v.union(v.literal("party_code"), v.literal("private_match_code"))
  ),
  selectedUsers: v.array(
    v.object({
      platform: v.union(v.literal("discord"), v.literal("twitch")),
      platformUserId: v.string(),

      // Compatibility field for current Discord-only action paths.
      discordUserId: v.optional(v.string()),

      username: v.string(),
      displayName: v.string(),
      avatarUrl: v.optional(v.string()),
      linkedUserId: v.optional(v.id("users")),
      rank: participantRankValidator,

      notificationMethod: v.optional(queueNotificationMethodValidator),
      notificationStatus: v.optional(queueNotificationStatusValidator),
      notificationFailureReason: v.optional(v.string()),

      // Compatibility fields for existing Discord DM handling.
      dmStatus: v.optional(v.union(v.literal("sent"), v.literal("failed"))),
      dmFailureReason: v.optional(v.string()),
    })
  ),
  selectedCount: v.number(),
  createdAt: v.number(),
})
  .index("by_queueId", ["queueId"])
  .index("by_queueId_and_createdAt", ["queueId", "createdAt"])
