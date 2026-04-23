import { v } from "convex/values"
import type { Doc } from "../../../_generated/dataModel"
import { internalQuery, query } from "../../../_generated/server"
import {
  getQueuePositionForIdentity,
  normalizePlatformUserId,
} from "../../../lib/playingWithViewersIdentity"
import { queuePlatformValidator } from "../../../lib/playingWithViewers"
import {
  hasEnabledPlayWithViewersTwitchContext,
  isPlayWithViewersTwitchEnabled,
  normalizePlayWithViewersTwitchContext,
} from "../../../lib/creatorToolsConfig"
import { requireValidTwitchWorkerSecret } from "../../../lib/workerAuth"

export const getEnabledTwitchQueues = internalQuery({
  args: {},
  handler: async (ctx) => {
    if (!isPlayWithViewersTwitchEnabled()) {
      return []
    }

    const activeQueues = await ctx.db
      .query("viewerQueues")
      .withIndex("by_isActive", (query) => query.eq("isActive", true))
      .collect()

    return activeQueues.filter((queue) =>
      hasEnabledPlayWithViewersTwitchContext(queue)
    )
  },
})

export const getPendingTwitchNotifications = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isPlayWithViewersTwitchEnabled()) {
      return []
    }

    const limit = Math.max(1, Math.min(args.limit ?? 25, 100))
    const now = Date.now()
    const notifications = await ctx.db
      .query("viewerQueueNotifications")
      .withIndex("by_platform_and_status_and_nextAttemptAt", (query) =>
        query
          .eq("platform", "twitch")
          .eq("notificationStatus", "pending")
          .lte("nextAttemptAt", now)
      )
      .take(limit)

    const items = await Promise.all(
      notifications.map(async (notification) => {
        const [queue, round] = await Promise.all([
          ctx.db.get(notification.queueId),
          ctx.db.get(notification.roundId),
        ])

        if (!queue || !round) {
          return null
        }

        return {
          notification,
          queue,
          round,
        }
      })
    )

    return items.reduce<
      Array<{
        notification: (typeof notifications)[number]
        queue: Doc<"viewerQueues">
        round: Doc<"viewerQueueRounds">
      }>
    >((result, item) => {
      if (item) {
        result.push(item)
      }

      return result
    }, [])
  },
})

export const getEnabledQueuesForWorker = query({
  args: {
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)

    if (!isPlayWithViewersTwitchEnabled()) {
      return []
    }

    const activeQueues = await ctx.db
      .query("viewerQueues")
      .withIndex("by_isActive", (query) => query.eq("isActive", true))
      .collect()

    return activeQueues
      .filter((queue) => hasEnabledPlayWithViewersTwitchContext(queue))
      .map((queue) => {
        const twitchContext = normalizePlayWithViewersTwitchContext(queue)

        return {
          creatorDisplayName: queue.creatorDisplayName,
          queueId: queue._id,
          title: queue.title,
          twitchBotAnnouncementsEnabled:
            twitchContext.twitchBotAnnouncementsEnabled,
          twitchBroadcasterId: twitchContext.twitchBroadcasterId,
          twitchBroadcasterLogin: twitchContext.twitchBroadcasterLogin,
        }
      })
  },
})

export const getQueueSnapshotForWorker = query({
  args: {
    platform: queuePlatformValidator,
    platformUserId: v.optional(v.string()),
    queueId: v.id("viewerQueues"),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)

    if (!isPlayWithViewersTwitchEnabled()) {
      throw new Error("Play With Viewers Twitch integration is disabled.")
    }

    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (query) =>
        query.eq("queueId", args.queueId)
      )
      .collect()

    const identityResult = args.platformUserId?.trim()
      ? await getQueuePositionForIdentity(ctx, {
          platform: args.platform,
          platformUserId: normalizePlatformUserId(args.platformUserId),
          queueId: args.queueId,
        })
      : null

    return {
      entries: entries.slice(0, 10).map((entry) => ({
        displayName: entry.displayName,
        platform: entry.platform,
        rank: entry.rank,
        username: entry.username,
      })),
      isActive: queue.isActive,
      queueId: queue._id,
      size: entries.length,
      yourPosition: identityResult?.position ?? null,
    }
  },
})

export const getPendingNotificationsForWorker = query({
  args: {
    limit: v.optional(v.number()),
    workerSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireValidTwitchWorkerSecret(args.workerSecret)

    if (!isPlayWithViewersTwitchEnabled()) {
      return []
    }

    const limit = Math.max(1, Math.min(args.limit ?? 25, 100))
    const now = Date.now()
    const notifications = await ctx.db
      .query("viewerQueueNotifications")
      .withIndex("by_platform_and_status_and_nextAttemptAt", (query) =>
        query
          .eq("platform", "twitch")
          .eq("notificationStatus", "pending")
          .lte("nextAttemptAt", now)
      )
      .take(limit)

    const jobs = await Promise.all(
      notifications.map(async (notification) => {
        const [queue, round] = await Promise.all([
          ctx.db.get(notification.queueId),
          ctx.db.get(notification.roundId),
        ])

        if (!queue || !round) {
          return null
        }

        const twitchContext = normalizePlayWithViewersTwitchContext(queue)

        return {
          attemptCount: notification.attemptCount,
          creatorDisplayName: queue.creatorDisplayName,
          displayName: notification.displayName,
          gameLabel: queue.gameLabel,
          inviteCode: round.lobbyCode,
          inviteCodeType: round.inviteCodeType,
          nextAttemptAt: notification.nextAttemptAt,
          notificationId: notification._id,
          platformUserId: notification.platformUserId,
          title: queue.title,
          twitchBroadcasterId: twitchContext.twitchBroadcasterId,
          twitchBroadcasterLogin: twitchContext.twitchBroadcasterLogin,
          username: notification.username,
        }
      })
    )

    return jobs.reduce<
      Array<{
        attemptCount: number
        creatorDisplayName: string
        displayName: string
        gameLabel: string
        inviteCode: string | undefined
        inviteCodeType: "party_code" | "private_match_code" | undefined
        nextAttemptAt: number
        notificationId: typeof notifications[number]["_id"]
        platformUserId: string
        title: string
        twitchBroadcasterId: string
        twitchBroadcasterLogin: string
        username: string
      }>
    >((result, job) => {
      if (job) {
        result.push(job)
      }

      return result
    }, [])
  },
})
