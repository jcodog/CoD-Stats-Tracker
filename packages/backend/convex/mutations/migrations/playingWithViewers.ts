import { v } from "convex/values"

import { internalMutation } from "../../_generated/server"
import {
  getDisabledPlayWithViewersTwitchContext,
  normalizePlayWithViewersTwitchContext,
} from "../../lib/creatorToolsConfig"
import {
  normalizeStoredQueueParticipant,
  normalizeStoredInviteMode,
} from "../../lib/playingWithViewers"

const LEGACY_INVITE_MODE = "discord_dm"
const CURRENT_BOT_DM_INVITE_MODE = "bot_dm"

export const migrateLegacyViewerQueueSchema = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const [queues, entries, rounds] = await Promise.all([
      ctx.db.query("viewerQueues").collect(),
      ctx.db.query("viewerQueueEntries").collect(),
      ctx.db.query("viewerQueueRounds").collect(),
    ])

    const disabledTwitchContext = getDisabledPlayWithViewersTwitchContext()
    const queueUpdates = queues.flatMap((queue) => {
      const nextInviteMode = normalizeStoredInviteMode(queue.inviteMode)
      const nextTwitchContext = normalizePlayWithViewersTwitchContext(queue)
      const patch: Record<string, unknown> = {}

      if (queue.inviteMode !== nextInviteMode) {
        patch.inviteMode = nextInviteMode
      }

      if (queue.twitchBotAnnouncementsEnabled === undefined) {
        patch.twitchBotAnnouncementsEnabled =
          disabledTwitchContext.twitchBotAnnouncementsEnabled
      }

      if (queue.twitchCommandsEnabled === undefined) {
        patch.twitchCommandsEnabled = disabledTwitchContext.twitchCommandsEnabled
      }

      if (queue.twitchBroadcasterId === undefined) {
        patch.twitchBroadcasterId = nextTwitchContext.twitchBroadcasterId
      }

      if (queue.twitchBroadcasterLogin === undefined) {
        patch.twitchBroadcasterLogin = nextTwitchContext.twitchBroadcasterLogin
      }

      return Object.keys(patch).length === 0
        ? []
        : [{ patch, queueId: queue._id }]
    })

    const entryUpdates = entries.flatMap((entry) => {
      try {
        const normalizedEntry = normalizeStoredQueueParticipant(entry)
        const patch: Record<string, unknown> = {}

        if (entry.platform !== normalizedEntry.platform) {
          patch.platform = normalizedEntry.platform
        }

        if (entry.platformUserId !== normalizedEntry.platformUserId) {
          patch.platformUserId = normalizedEntry.platformUserId
        }

        if (entry.discordUserId !== normalizedEntry.discordUserId) {
          patch.discordUserId = normalizedEntry.discordUserId
        }

        return Object.keys(patch).length === 0
          ? []
          : [{ entryId: entry._id, patch }]
      } catch {
        return []
      }
    })

    const roundUpdates = rounds.flatMap((round) => {
      const patch: Record<string, unknown> = {}
      const nextMode = normalizeStoredInviteMode(round.mode)

      if (round.mode !== nextMode) {
        patch.mode = nextMode
      }

      let selectedUsersChanged = false
      const nextSelectedUsers = round.selectedUsers.map((user) => {
        try {
          const normalizedUser = normalizeStoredQueueParticipant(user)

          if (
            user.platform !== normalizedUser.platform ||
            user.platformUserId !== normalizedUser.platformUserId ||
            user.discordUserId !== normalizedUser.discordUserId
          ) {
            selectedUsersChanged = true
          }

          return normalizedUser
        } catch {
          return user
        }
      })

      if (selectedUsersChanged) {
        patch.selectedUsers = nextSelectedUsers
      }

      return Object.keys(patch).length === 0
        ? []
        : [{ patch, roundId: round._id }]
    })

    if (!(args.dryRun ?? false)) {
      const now = Date.now()

      for (const { patch, queueId } of queueUpdates) {
        await ctx.db.patch(queueId, {
          ...patch,
          updatedAt: now,
        })
      }

      for (const { entryId, patch } of entryUpdates) {
        await ctx.db.patch(entryId, patch)
      }

      for (const { patch, roundId } of roundUpdates) {
        await ctx.db.patch(roundId, patch)
      }
    }

    return {
      dryRun: args.dryRun ?? false,
      updatedEntryCount: entryUpdates.length,
      updatedEntryIds: entryUpdates.map(({ entryId }) => entryId),
      updatedQueueCount: queueUpdates.length,
      updatedQueueIds: queueUpdates.map(({ queueId }) => queueId),
      updatedRoundCount: roundUpdates.length,
      updatedRoundIds: roundUpdates.map(({ roundId }) => roundId),
    }
  },
})

export const migrateLegacyViewerQueueInviteModes = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const [queues, rounds] = await Promise.all([
      ctx.db.query("viewerQueues").collect(),
      ctx.db.query("viewerQueueRounds").collect(),
    ])

    const legacyQueues = queues.filter(
      (queue) => queue.inviteMode === LEGACY_INVITE_MODE
    )
    const legacyRounds = rounds.filter(
      (round) => round.mode === LEGACY_INVITE_MODE
    )

    if (!(args.dryRun ?? false)) {
      const now = Date.now()

      for (const queue of legacyQueues) {
        await ctx.db.patch(queue._id, {
          inviteMode: CURRENT_BOT_DM_INVITE_MODE,
          updatedAt: now,
        })
      }

      for (const round of legacyRounds) {
        await ctx.db.patch(round._id, {
          mode: CURRENT_BOT_DM_INVITE_MODE,
        })
      }
    }

    return {
      dryRun: args.dryRun ?? false,
      legacyQueueIds: legacyQueues.map((queue) => queue._id),
      legacyRoundIds: legacyRounds.map((round) => round._id),
      updatedQueueCount: legacyQueues.length,
      updatedRoundCount: legacyRounds.length,
    }
  },
})

export const disableViewerQueueTwitchIntegration = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queues = await ctx.db.query("viewerQueues").collect()
    const disabledTwitchContext = getDisabledPlayWithViewersTwitchContext()
    const queuesToUpdate = queues.filter(
      (queue) =>
        queue.twitchBotAnnouncementsEnabled !==
          disabledTwitchContext.twitchBotAnnouncementsEnabled ||
        queue.twitchCommandsEnabled !==
          disabledTwitchContext.twitchCommandsEnabled ||
        queue.twitchBroadcasterId !== disabledTwitchContext.twitchBroadcasterId ||
        queue.twitchBroadcasterLogin !==
          disabledTwitchContext.twitchBroadcasterLogin
    )

    if (!(args.dryRun ?? false)) {
      const now = Date.now()

      for (const queue of queuesToUpdate) {
        await ctx.db.patch(queue._id, {
          ...disabledTwitchContext,
          updatedAt: now,
        })
      }
    }

    return {
      dryRun: args.dryRun ?? false,
      queueIds: queuesToUpdate.map((queue) => queue._id),
      updatedQueueCount: queuesToUpdate.length,
    }
  },
})
