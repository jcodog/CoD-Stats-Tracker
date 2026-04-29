"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import type { Doc, Id } from "../../../_generated/dataModel"
import { action, type ActionCtx } from "../../../_generated/server"
import {
  inviteCodeTypeValidator,
  inviteModeValidator,
  queueConfigRankValidator,
} from "../../../../src/lib/playingWithViewers"
import { getDisabledPlayWithViewersTwitchContext } from "../../../../src/lib/creatorToolsConfig"
import {
  requireOwnedQueueActionAccess,
  requireOwnedQueueEntryActionAccess,
} from "../../../../src/lib/creatorToolsActionAuth"
import type {
  QueueClearResult,
  QueueIdResult,
  QueueRemoveEntryResult,
  QueueSelectionResult,
  QueueSetActiveResult,
} from "../../../mutations/creatorTools/playingWithViewers/queue"

type UpdatedRoundResult = {
  createdAt: number
  roundId: Id<"viewerQueueRounds">
  selectedCount: number
  selectedUsers: Doc<"viewerQueueRounds">["selectedUsers"]
}

type SelectNextBatchAndNotifyResult = UpdatedRoundResult & {
  inviteMode: QueueSelectionResult["mode"]
  selectionKind: "batch"
}

type InviteQueueEntryNowAndNotifyResult = UpdatedRoundResult & {
  inviteMode: QueueSelectionResult["mode"]
  selectionKind: "entry"
}

async function getUpdatedRoundResult(
  ctx: ActionCtx,
  roundId: Id<"viewerQueueRounds">
): Promise<UpdatedRoundResult> {
  const round: Doc<"viewerQueueRounds"> | null = await ctx.runQuery(
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
    twitchBotEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<QueueIdResult> => {
    const access = await requireOwnedQueueActionAccess(ctx, args.queueId)
    const twitchBotEnabled =
      args.twitchBotEnabled ??
      (access.queue.twitchCommandsEnabled ||
        access.queue.twitchBotAnnouncementsEnabled)
    const twitchContext = access.hasTwitchLinked
      ? {
          twitchBotAnnouncementsEnabled: twitchBotEnabled,
          twitchBroadcasterId: access.twitchAccount.providerUserId,
          twitchBroadcasterLogin:
            access.twitchAccount.providerLogin ??
            access.twitchAccount.displayName ??
            "",
          twitchCommandsEnabled: twitchBotEnabled,
        }
      : getDisabledPlayWithViewersTwitchContext()

    const result: QueueIdResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue
        .updateQueueSettings,
      {
        ...args,
        ...twitchContext,
      }
    )

    return result
  },
})

export const setQueueActive = action({
  args: {
    isActive: v.boolean(),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args): Promise<QueueSetActiveResult> => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    const result: QueueSetActiveResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueActive,
      args
    )

    return result
  },
})

export const clearQueue = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args): Promise<QueueClearResult> => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    const result: QueueClearResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.clearQueue,
      args
    )

    return result
  },
})

export const removeQueueEntry = action({
  args: {
    entryId: v.id("viewerQueueEntries"),
  },
  handler: async (ctx, args): Promise<QueueRemoveEntryResult> => {
    const { queue } = await requireOwnedQueueEntryActionAccess(
      ctx,
      args.entryId
    )
    const result: QueueRemoveEntryResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.removeQueueEntry,
      args
    )

    await ctx.runAction(
      internal.actions.creatorTools.playingWithViewers.discord
        .syncQueueMessageAfterViewerInteraction,
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
  handler: async (ctx, args): Promise<SelectNextBatchAndNotifyResult> => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    const result: QueueSelectionResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.selectNextBatch,
      args
    )

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.notifications
        .initializeRoundNotifications,
      {
        roundId: result.roundId,
      }
    )

    if (result.mode === "bot_dm") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord
          .deliverDiscordNotificationsForRound,
        {
          roundId: result.roundId,
        }
      )
    }

    const updatedRound = await getUpdatedRoundResult(ctx, result.roundId)

    return {
      ...updatedRound,
      inviteMode: result.mode,
      selectionKind: "batch",
    }
  },
})

export const inviteQueueEntryNowAndNotify = action({
  args: {
    entryId: v.id("viewerQueueEntries"),
    inviteCode: v.optional(v.string()),
    inviteCodeType: v.optional(inviteCodeTypeValidator),
  },
  handler: async (
    ctx,
    args
  ): Promise<InviteQueueEntryNowAndNotifyResult> => {
    await requireOwnedQueueEntryActionAccess(ctx, args.entryId)

    const result: QueueSelectionResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue
        .inviteQueueEntryNow,
      args
    )

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.notifications
        .initializeRoundNotifications,
      {
        roundId: result.roundId,
      }
    )

    if (result.mode === "bot_dm") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord
          .deliverDiscordNotificationsForRound,
        {
          roundId: result.roundId,
        }
      )
    }

    const updatedRound = await getUpdatedRoundResult(ctx, result.roundId)

    return {
      ...updatedRound,
      inviteMode: result.mode,
      selectionKind: "entry",
    }
  },
})
