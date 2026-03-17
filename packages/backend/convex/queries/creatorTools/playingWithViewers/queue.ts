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

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (q) =>
        q.eq("queueId", args.queueId)
      )
      .collect()

    return entries
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

    const round = await ctx.db.get(queue.lastSelectedRoundId)

    if (!round) {
      return null
    }

    return round
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

    const queue = await ctx.db
      .query("viewerQueues")
      .withIndex("by_guildId_and_channelId", (q) =>
        q.eq("guildId", guildId).eq("channelId", channelId)
      )
      .first()

    return queue
  },
})

export const getQueueByCreatorUserId = internalQuery({
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

export const getQueueEntryById = internalQuery({
  args: {
    entryId: v.id("viewerQueueEntries"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId)
  },
})

export const getCurrentCreatorQueue = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { user } = await requireCreatorToolsViewerAccess(ctx)

      return await ctx.db
        .query("viewerQueues")
        .withIndex("by_creatorUserId", (query) => query.eq("creatorUserId", user._id))
        .first()
    } catch {
      return null
    }
  },
})

export const getCurrentCreatorQueueEntries = query({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    try {
      const { user } = await requireCreatorToolsViewerAccess(ctx)
      const queue = await ctx.db.get(args.queueId)

      if (!queue || queue.creatorUserId !== user._id) {
        return []
      }

      return await ctx.db
        .query("viewerQueueEntries")
        .withIndex("by_queueId_and_joinedAt", (query) =>
          query.eq("queueId", args.queueId)
        )
        .collect()
    } catch {
      return []
    }
  },
})
