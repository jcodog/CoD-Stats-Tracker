"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import type { Id } from "../../../_generated/dataModel"
import { action, type ActionCtx } from "../../../_generated/server"
import {
  inviteCodeTypeValidator,
  inviteModeValidator,
  queueConfigRankValidator,
} from "../../../lib/playingWithViewers"
import {
  requireOwnedQueueActionAccess,
  requireOwnedQueueEntryActionAccess,
} from "../../../lib/creatorToolsActionAuth"

async function getUpdatedRoundResult(
  ctx: ActionCtx,
  roundId: Id<"viewerQueueRounds">
) {
  const round = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getRoundById,
    {
      roundId,
    }
  )

  if (!round) {
    throw new Error("Queue round not found")
  }

  return {
    createdAt: round.createdAt,
    roundId: round._id,
    selectedCount: round.selectedCount,
    selectedUsers: round.selectedUsers,
  }
}

export const updateQueueSettings = action({
  args: {
    creatorDisplayName: v.string(),
    creatorMessage: v.optional(v.string()),
    gameLabel: v.string(),
    inviteMode: inviteModeValidator,
    matchesPerViewer: v.number(),
    maxRank: queueConfigRankValidator,
    minRank: queueConfigRankValidator,
    playersPerBatch: v.number(),
    queueId: v.id("viewerQueues"),
    rulesText: v.optional(v.string()),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { twitchAccount } = await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.updateQueueSettings,
      {
        ...args,
        twitchBroadcasterId: twitchAccount.providerUserId,
        twitchBroadcasterLogin:
          twitchAccount.providerLogin ?? twitchAccount.displayName ?? "",
      }
    )
  },
})

export const setQueueActive = action({
  args: {
    isActive: v.boolean(),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueActive,
      args
    )
  },
})

export const clearQueue = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.clearQueue,
      args
    )
  },
})

export const removeQueueEntry = action({
  args: {
    entryId: v.id("viewerQueueEntries"),
  },
  handler: async (ctx, args) => {
    const { queue } = await requireOwnedQueueEntryActionAccess(ctx, args.entryId)
    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.removeQueueEntry,
      args
    )

    await ctx.runAction(
      internal.actions.creatorTools.playingWithViewers.discord.syncQueueMessageAfterViewerInteraction,
      {
        queueId: queue._id,
      }
    )

    return result
  },
})

export const selectNextBatchAndNotify = action({
  args: {
    inviteCode: v.optional(v.string()),
    inviteCodeType: v.optional(inviteCodeTypeValidator),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.selectNextBatch,
      args
    )

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.notifications.initializeRoundNotifications,
      {
        roundId: result.roundId,
      }
    )

    if (result.mode === "bot_dm") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord.deliverDiscordNotificationsForRound,
        {
          roundId: result.roundId,
        }
      )
    }

    const updatedRound = await getUpdatedRoundResult(ctx, result.roundId)

    return {
      ...updatedRound,
      inviteMode: result.mode,
      selectionKind: "batch" as const,
    }
  },
})

export const inviteQueueEntryNowAndNotify = action({
  args: {
    entryId: v.id("viewerQueueEntries"),
    inviteCode: v.optional(v.string()),
    inviteCodeType: v.optional(inviteCodeTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueEntryActionAccess(ctx, args.entryId)

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.inviteQueueEntryNow,
      args
    )

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.notifications.initializeRoundNotifications,
      {
        roundId: result.roundId,
      }
    )

    if (result.mode === "bot_dm") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord.deliverDiscordNotificationsForRound,
        {
          roundId: result.roundId,
        }
      )
    }

    const updatedRound = await getUpdatedRoundResult(ctx, result.roundId)

    return {
      ...updatedRound,
      inviteMode: result.mode,
      selectionKind: "entry" as const,
    }
  },
})
