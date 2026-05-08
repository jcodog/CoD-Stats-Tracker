"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import type { Id } from "../../../_generated/dataModel"
import { action, type ActionCtx } from "../../../_generated/server"
import type { BillingStatePlanLike } from "../../../../src/lib/billingAccess"
import { getClerkBackendClient } from "../../../../src/lib/clerk"
import { getTwitchAccountFromClerkUser } from "../../../../src/lib/clerkUsers"
import {
  inviteCodeTypeValidator,
  inviteModeValidator,
  queueConfigRankValidator,
  type InviteMode,
  type ParticipantRankValue,
  type QueuePlatform,
  type StoredInviteMode,
} from "../../../../src/lib/playingWithViewers"
import {
  getDisabledPlayWithViewersTwitchContext,
  isPlayWithViewersTwitchEnabled,
} from "../../../../src/lib/creatorToolsConfig"
import {
  assertOwnedQueueActionAccess,
  assertOwnedQueueEntryActionAccess,
  resolveCreatorToolsActionAccess,
  type CreatorActionActor,
} from "../../../../src/lib/creatorToolsActionAuth"

type QueueIdResult = {
  queueId: string
}

type QueueSetActiveResult = {
  isActive: boolean
  queueId: string
}

type QueueClearResult = {
  clearedCount: number
  queueId: string
}

type QueueRemoveEntryResult = {
  entryId: string
  queueId: string
  removed: true
}

type QueueSelectedUser = {
  avatarUrl?: string
  displayName: string
  discordUserId?: string
  dmFailureReason?: string
  dmStatus?: "failed" | "sent"
  linkedUserId?: string
  notificationFailureReason?: string
  notificationMethod?:
    | "discord_dm"
    | "manual_creator_contact"
    | "twitch_chat_fallback"
    | "twitch_whisper"
  notificationStatus?: "failed" | "pending" | "sent"
  platform: QueuePlatform
  platformUserId: string
  rank: ParticipantRankValue
  username: string
}

type QueueSelectionResult = {
  mode: StoredInviteMode
  queueId: string
  roundId: string
  selectedCount: number
  selectedUsers: QueueSelectedUser[]
}

type CreatorAccountRecord = {
  _id: string
}

type ViewerQueueRecord = {
  _id: string
  creatorUserId: string
}

type ViewerQueueEntryRecord = {
  _id: string
  queueId: string
}

type ViewerQueueRoundRecord = {
  _id: string
  createdAt: number
  selectedCount: number
  selectedUsers: QueueSelectedUser[]
}

type UpdatedRoundResult = {
  createdAt: number
  roundId: string
  selectedCount: number
  selectedUsers: QueueSelectedUser[]
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
  const round: ViewerQueueRoundRecord | null = await ctx.runQuery(
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
        queueId: queue._id as Id<"viewerQueues">,
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
        roundId: result.roundId as Id<"viewerQueueRounds">,
      }
    )

    if (result.mode === "bot_dm") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord
          .deliverDiscordNotificationsForRound,
        {
          roundId: result.roundId as Id<"viewerQueueRounds">,
        }
      )
    }

    const updatedRound = await getUpdatedRoundResult(
      ctx,
      result.roundId as Id<"viewerQueueRounds">
    )

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
        roundId: result.roundId as Id<"viewerQueueRounds">,
      }
    )

    if (result.mode === "bot_dm") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord
          .deliverDiscordNotificationsForRound,
        {
          roundId: result.roundId as Id<"viewerQueueRounds">,
        }
      )
    }

    const updatedRound = await getUpdatedRoundResult(
      ctx,
      result.roundId as Id<"viewerQueueRounds">
    )

    return {
      ...updatedRound,
      inviteMode: result.mode,
      selectionKind: "entry",
    }
  },
})


async function requireCreatorToolsActionAccess(
  ctx: ActionCtx,
  options?: { requireTwitchLinked?: boolean }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("You must be signed in to manage Play With Viewers.")
  }

  const user: CreatorActionActor["user"] | null = await ctx.runQuery(
    internal.queries.staff.internal.getUserByClerkUserId,
    {
      clerkUserId: identity.subject,
    }
  )

  if (!user) {
    throw new Error("Unable to resolve your creator account.")
  }

  const userId = user._id as Id<"users">
  const [billingState, creatorAccount]: [
    BillingStatePlanLike | null,
    CreatorAccountRecord | null,
  ] = await Promise.all([
    ctx.runQuery(internal.queries.billing.resolution.resolveUserPlanState, {
      userId,
    }),
    ctx.runQuery(internal.queries.creator.accounts.internal.getCreatorAccountByUserId, {
      userId,
    }),
  ])
  const shouldLoadTwitchAccount =
    (options?.requireTwitchLinked ?? true) && isPlayWithViewersTwitchEnabled()
  const twitchAccount = shouldLoadTwitchAccount
    ? getTwitchAccountFromClerkUser(
        await getClerkBackendClient().users.getUser(identity.subject)
      )
    : null

  return await resolveCreatorToolsActionAccess({
    billingState,
    clerkUserId: identity.subject,
    creatorAccount,
    requireTwitchLinked: options?.requireTwitchLinked,
    twitchAccount,
    user,
  })
}

async function requireOwnedQueueActionAccess(
  ctx: ActionCtx,
  queueId: Id<"viewerQueues">
) {
  const actor = await requireCreatorToolsActionAccess(ctx)
  const queue: ViewerQueueRecord = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId,
    }
  )

  return assertOwnedQueueActionAccess(actor, queue)
}

async function requireOwnedQueueEntryActionAccess(
  ctx: ActionCtx,
  entryId: Id<"viewerQueueEntries">
) {
  const actor = await requireCreatorToolsActionAccess(ctx)
  const entry: ViewerQueueEntryRecord | null = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueEntryById,
    {
      entryId,
    }
  )

  if (!entry) {
    throw new Error("Queue entry not found")
  }

  const queue: ViewerQueueRecord = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId: entry.queueId as Id<"viewerQueues">,
    }
  )

  return assertOwnedQueueEntryActionAccess(actor, entry, queue)
}
