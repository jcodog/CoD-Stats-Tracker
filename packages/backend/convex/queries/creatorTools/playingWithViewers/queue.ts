import { v } from "convex/values"
import { query } from "../../../_generated/server"

export const getQueueById = query({
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

export const getQueueEntries = query({
  args: {
    queueId: v.id("viewerQueues"),
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

    return entries
  },
})

export const getLatestQueueRound = query({
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

    const round = await ctx.db.get(queue.lastSelectedRoundId)

    if (!round) {
      return null
    }

    return round
  },
})

export const getQueueByGuildAndChannel = query({
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

    const queue = await ctx.db
      .query("viewerQueues")
      .withIndex("by_guildId_and_channelId", (q) =>
        q.eq("guildId", guildId).eq("channelId", channelId)
      )
      .first()

    return queue
  },
})

export const getQueueByCreatorUserId = query({
  args: {
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (q) =>
        q.eq("creatorUserId", args.creatorUserId)
      )
      .first()

    return queue
  },
})
