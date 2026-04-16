import { v } from "convex/values"
import { internalQuery, query } from "../../../_generated/server"
import { requireCreatorToolsViewerAccess } from "../../../lib/creatorToolsAccess"

export const getQueueById = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    return queue
  },
})

export const getQueueEntries = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    return await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (q) =>
        q.eq("queueId", args.queueId)
      )
      .collect()
  },
})

export const getLatestQueueRound = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    if (!queue.lastSelectedRoundId) {
      return null
    }

    return await ctx.db.get(queue.lastSelectedRoundId)
  },
})

export const getQueueByGuildAndChannel = internalQuery({
  args: {
    guildId: v.string(),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const guildId = args.guildId.trim()
    const channelId = args.channelId.trim()

    if (!guildId) {
      throw new Error("guildId is required")
    }

    if (!channelId) {
      throw new Error("channelId is required")
    }

    return await ctx.db
      .query("viewerQueues")
      .withIndex("by_guildId_and_channelId", (q) =>
        q.eq("guildId", guildId).eq("channelId", channelId)
      )
      .first()
  },
})

export const getQueueByCreatorUserId = internalQuery({
  args: {
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (q) =>
        q.eq("creatorUserId", args.creatorUserId)
      )
      .first()
  },
})

export const getQueueByTwitchBroadcasterId = internalQuery({
  args: {
    twitchBroadcasterId: v.string(),
  },
  handler: async (ctx, args) => {
    const twitchBroadcasterId = args.twitchBroadcasterId.trim()

    if (!twitchBroadcasterId) {
      throw new Error("twitchBroadcasterId is required")
    }

    return await ctx.db
      .query("viewerQueues")
      .withIndex("by_twitchBroadcasterId", (q) =>
        q.eq("twitchBroadcasterId", twitchBroadcasterId)
      )
  },
})
