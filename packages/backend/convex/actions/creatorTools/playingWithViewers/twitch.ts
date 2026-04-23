"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { action } from "../../../_generated/server"
import {
  participantQueueRankValidator,
  queueNotificationMethodValidator,
} from "../../../lib/playingWithViewers"
import { isPlayWithViewersTwitchEnabled } from "../../../lib/creatorToolsConfig"
import { requireValidTwitchWorkerSecret } from "../../../lib/workerAuth"

function requirePlayWithViewersTwitchEnabled() {
  if (!isPlayWithViewersTwitchEnabled()) {
    throw new Error("Play With Viewers Twitch integration is disabled.")
  }
}

export const enqueueViewerFromWorker = action({
  args: {
    avatarUrl: v.optional(v.string()),
    displayName: v.string(),
    queueId: v.id("viewerQueues"),
    rank: participantQueueRankValidator,
    twitchLogin: v.string(),
    twitchUserId: v.string(),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)
    requirePlayWithViewersTwitchEnabled()

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.enqueueViewerFromPlatform,
      {
        avatarUrl: args.avatarUrl,
        displayName: args.displayName,
        platform: "twitch",
        platformUserId: args.twitchUserId,
        queueId: args.queueId,
        rank: args.rank,
        username: args.twitchLogin,
      }
    )

    if (result.status === "enqueued") {
      await ctx.runAction(
        internal.actions.creatorTools.playingWithViewers.discord.syncQueueMessageAfterViewerInteraction,
        {
          queueId: args.queueId,
        }
      )
    }

    return result
  },
})

export const leaveViewerFromWorker = action({
  args: {
    queueId: v.id("viewerQueues"),
    twitchUserId: v.string(),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)
    requirePlayWithViewersTwitchEnabled()

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.leaveQueueFromPlatform,
      {
        platform: "twitch",
        platformUserId: args.twitchUserId,
        queueId: args.queueId,
      }
    )

    await ctx.runAction(
      internal.actions.creatorTools.playingWithViewers.discord.syncQueueMessageAfterViewerInteraction,
      {
        queueId: args.queueId,
      }
    )

    return result
  },
})

export const recordNotificationResultFromWorker = action({
  args: {
    notificationFailureReason: v.optional(v.string()),
    notificationId: v.id("viewerQueueNotifications"),
    notificationMethod: queueNotificationMethodValidator,
    notificationStatus: v.union(v.literal("sent"), v.literal("failed")),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)
    requirePlayWithViewersTwitchEnabled()

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.notifications.recordNotificationResult,
      {
        notificationFailureReason: args.notificationFailureReason,
        notificationId: args.notificationId,
        notificationMethod: args.notificationMethod,
        notificationStatus: args.notificationStatus,
      }
    )
  },
})

export const deferNotificationFromWorker = action({
  args: {
    nextAttemptAt: v.number(),
    notificationFailureReason: v.optional(v.string()),
    notificationId: v.id("viewerQueueNotifications"),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)
    requirePlayWithViewersTwitchEnabled()

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.notifications.deferNotification,
      {
        nextAttemptAt: args.nextAttemptAt,
        notificationFailureReason: args.notificationFailureReason,
        notificationId: args.notificationId,
      }
    )
  },
})
