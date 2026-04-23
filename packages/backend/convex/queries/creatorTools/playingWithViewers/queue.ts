import { v } from "convex/values"
import { internalQuery, query } from "../../../_generated/server"
import {
  getQueuePositionForIdentity,
  normalizePlatformUserId,
} from "../../../lib/playingWithViewersIdentity"
import {
  queuePlatformValidator,
} from "../../../lib/playingWithViewers"
import {
  requireCreatorToolsViewerAccess,
  requireOwnedCreatorQueueAccess,
} from "../../../lib/creatorToolsAccess"

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
      .withIndex("by_queueId_and_joinedAt", (query) =>
        query.eq("queueId", args.queueId)
      )
      .collect()
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

export const getRoundById = internalQuery({
  args: {
    roundId: v.id("viewerQueueRounds"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roundId)
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
      .withIndex("by_guildId_and_channelId", (query) =>
        query.eq("guildId", guildId).eq("channelId", channelId)
      )
      .unique()
  },
})

export const getQueueByCreatorUserId = internalQuery({
  args: {
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (query) =>
        query.eq("creatorUserId", args.creatorUserId)
      )
      .unique()
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
      .withIndex("by_twitchBroadcasterId", (query) =>
        query.eq("twitchBroadcasterId", twitchBroadcasterId)
      )
      .unique()
  },
})

export const getQueueStatusForIdentity = internalQuery({
  args: {
    platform: queuePlatformValidator,
    platformUserId: v.string(),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const { entries, position } = await getQueuePositionForIdentity(ctx, {
      platform: args.platform,
      platformUserId: normalizePlatformUserId(args.platformUserId),
      queueId: args.queueId,
    })

    return {
      isActive: queue.isActive,
      joined: position !== null,
      queueId: queue._id,
      queuePosition: position,
      queueSize: entries.length,
    }
  },
})

export const getCurrentCreatorQueue = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCreatorToolsViewerAccess(ctx)

    return await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (query) =>
        query.eq("creatorUserId", user._id)
      )
      .unique()
  },
})

export const getCurrentCreatorQueueEntries = query({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedCreatorQueueAccess(ctx, args.queueId)

    return await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (query) =>
        query.eq("queueId", args.queueId)
      )
      .collect()
  },
})

export const getQueueRoundById = query({
  args: {
    roundId: v.id("viewerQueueRounds"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCreatorToolsViewerAccess(ctx)
    const round = await ctx.db.get(args.roundId)

    if (!round) {
      return null
    }

    const queue = await ctx.db.get(round.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    if (queue.creatorUserId !== user._id) {
      throw new Error("You do not have access to this queue round.")
    }

    return round
  },
})
