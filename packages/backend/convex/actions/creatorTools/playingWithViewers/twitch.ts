"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import type { Id } from "../../../_generated/dataModel"
import { action, type ActionCtx } from "../../../_generated/server"
import { getConvexEnv } from "../../../env"
import {
  participantQueueRankValidator,
  queueNotificationMethodValidator,
} from "../../../lib/playingWithViewers"
import {
  isPlayWithViewersTwitchEnabled,
  normalizePlayWithViewersTwitchContext,
} from "../../../lib/creatorToolsConfig"
import { requireValidTwitchWorkerSecret } from "../../../lib/workerAuth"

const DISCORD_API_BASE = "https://discord.com/api/v10"

function requirePlayWithViewersTwitchEnabled() {
  if (!isPlayWithViewersTwitchEnabled()) {
    throw new Error("Play With Viewers Twitch integration is disabled.")
  }
}

function getDiscordBotToken() {
  const token = getConvexEnv().DISCORD_BOT_TOKEN?.trim()

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured")
  }

  return token
}

async function discordBotRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${getDiscordBotToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Discord API ${path} failed (${response.status}): ${body}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function getDiscordChannelUrl(args: { channelId: string; guildId: string }) {
  return `https://discord.com/channels/${args.guildId}/${args.channelId}`
}

async function getQueueForWorker(ctx: ActionCtx, queueId: Id<"viewerQueues">) {
  return await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId,
    }
  )
}

async function requireTwitchCommandsEnabledForQueue(
  ctx: ActionCtx,
  queueId: Id<"viewerQueues">
) {
  const queue = await getQueueForWorker(ctx, queueId)
  const twitchContext = normalizePlayWithViewersTwitchContext(queue)

  if (!twitchContext.twitchCommandsEnabled) {
    throw new Error("Twitch bot is disabled for this queue.")
  }

  return queue
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
    await requireTwitchCommandsEnabledForQueue(ctx, args.queueId)

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue
        .enqueueViewerFromPlatform,
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
        internal.actions.creatorTools.playingWithViewers.discord
          .syncQueueMessageAfterViewerInteraction,
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
    await requireTwitchCommandsEnabledForQueue(ctx, args.queueId)

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue
        .leaveQueueFromPlatform,
      {
        platform: "twitch",
        platformUserId: args.twitchUserId,
        queueId: args.queueId,
      }
    )

    await ctx.runAction(
      internal.actions.creatorTools.playingWithViewers.discord
        .syncQueueMessageAfterViewerInteraction,
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
      internal.mutations.creatorTools.playingWithViewers.notifications
        .recordNotificationResult,
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
      internal.mutations.creatorTools.playingWithViewers.notifications
        .deferNotification,
      {
        nextAttemptAt: args.nextAttemptAt,
        notificationFailureReason: args.notificationFailureReason,
        notificationId: args.notificationId,
      }
    )
  },
})

export const getDiscordQueueInviteForWorker = action({
  args: {
    queueId: v.id("viewerQueues"),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)
    requirePlayWithViewersTwitchEnabled()

    const queue = await getQueueForWorker(ctx, args.queueId)
    const discordChannelUrl = getDiscordChannelUrl({
      channelId: queue.channelId,
      guildId: queue.guildId,
    })

    try {
      const invite = await discordBotRequest<{ code?: string }>(
        `/channels/${queue.channelId}/invites`,
        {
          body: JSON.stringify({
            max_age: 3600,
            max_uses: 0,
            temporary: false,
            unique: false,
          }),
          method: "POST",
        }
      )

      return {
        channelName: queue.channelName ?? "play-with-viewers",
        discordChannelUrl,
        discordInviteUrl: invite.code
          ? `https://discord.gg/${invite.code}`
          : discordChannelUrl,
        guildName: queue.guildName,
      }
    } catch (error) {
      console.error("Failed to create Discord invite for Twitch fallback", {
        error,
        queueId: args.queueId,
      })

      return {
        channelName: queue.channelName ?? "play-with-viewers",
        discordChannelUrl,
        discordInviteUrl: discordChannelUrl,
        guildName: queue.guildName,
      }
    }
  },
})
