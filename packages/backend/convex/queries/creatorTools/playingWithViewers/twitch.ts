import { v } from "convex/values"
import { internalQuery } from "../../../_generated/server"

export const getEnabledTwitchQueues = internalQuery({
  args: {},
  handler: async (ctx) => {
    const queues = await ctx.db.query("viewerQueues").collect()

    return queues.filter(
      (queue) =>
        queue.isActive &&
        queue.twitchCommandsEnabled &&
        queue.twitchBroadcasterId.trim().length > 0
    )
  },
})

export const getQueueSnapshotForTwitch = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
    platformUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (q) =>
        q.eq("queueId", args.queueId)
      )
      .collect()

    const normalizedPlatformUserId = args.platformUserId?.trim()

    const yourPosition = normalizedPlatformUserId
      ? entries.findIndex(
          (entry) =>
            entry.platform === "twitch" &&
            entry.platformUserId === normalizedPlatformUserId
        )
      : -1

    return {
      queueId: queue._id,
      isActive: queue.isActive,
      size: entries.length,
      yourPosition: yourPosition === -1 ? null : yourPosition + 1,
      entries: entries.slice(0, 10),
    }
  },
})
