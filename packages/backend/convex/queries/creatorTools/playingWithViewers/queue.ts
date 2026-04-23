import { v } from "convex/values"
import type { Doc } from "../../../_generated/dataModel"
import { internalQuery, query, type QueryCtx } from "../../../_generated/server"
import {
  getQueuePositionForIdentity,
  normalizePlatformUserId,
} from "../../../lib/playingWithViewersIdentity"
import {
  normalizeStoredQueueParticipant,
  normalizeStoredInviteMode,
  queuePlatformValidator,
} from "../../../lib/playingWithViewers"
import {
  requireCreatorToolsViewerAccess,
  requireOwnedCreatorQueueAccess,
} from "../../../lib/creatorToolsAccess"
import { normalizePlayWithViewersTwitchContext } from "../../../lib/creatorToolsConfig"

function normalizeViewerQueue(queue: Doc<"viewerQueues">) {
  return {
    ...queue,
    ...normalizePlayWithViewersTwitchContext(queue),
    inviteMode: normalizeStoredInviteMode(queue.inviteMode),
  }
}

function normalizeViewerQueueEntry(entry: Doc<"viewerQueueEntries">) {
  return normalizeStoredQueueParticipant(entry)
}

function normalizeViewerQueueRound(round: Doc<"viewerQueueRounds">) {
  return {
    ...round,
    mode: normalizeStoredInviteMode(round.mode),
    selectedUsers: round.selectedUsers.map((user) =>
      normalizeStoredQueueParticipant(user)
    ),
  }
}

async function getQueueDocOrThrow(
  ctx: Pick<QueryCtx, "db">,
  queueId: Doc<"viewerQueues">["_id"]
) {
  const queue = await ctx.db.get(queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  return queue
}

export const getQueueById = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    return normalizeViewerQueue(await getQueueDocOrThrow(ctx, args.queueId))
  },
})

export const getQueueEntries = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await getQueueDocOrThrow(ctx, args.queueId)

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (query) =>
        query.eq("queueId", args.queueId)
      )
      .collect()

    return entries.map(normalizeViewerQueueEntry)
  },
})

export const getQueueEntryById = internalQuery({
  args: {
    entryId: v.id("viewerQueueEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)
    return entry ? normalizeViewerQueueEntry(entry) : null
  },
})

export const getLatestQueueRound = internalQuery({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await getQueueDocOrThrow(ctx, args.queueId)

    if (!queue.lastSelectedRoundId) {
      return null
    }

    const round = await ctx.db.get(queue.lastSelectedRoundId)

    return round ? normalizeViewerQueueRound(round) : null
  },
})

export const getRoundById = internalQuery({
  args: {
    roundId: v.id("viewerQueueRounds"),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId)

    return round ? normalizeViewerQueueRound(round) : null
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
      .withIndex("by_guildId_and_channelId", (query) =>
        query.eq("guildId", guildId).eq("channelId", channelId)
      )
      .unique()

    return queue ? normalizeViewerQueue(queue) : null
  },
})

export const getQueueByCreatorUserId = internalQuery({
  args: {
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (query) =>
        query.eq("creatorUserId", args.creatorUserId)
      )
      .unique()

    return queue ? normalizeViewerQueue(queue) : null
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

    const queue = await ctx.db
      .query("viewerQueues")
      .withIndex("by_twitchBroadcasterId", (query) =>
        query.eq("twitchBroadcasterId", twitchBroadcasterId)
      )
      .unique()

    return queue ? normalizeViewerQueue(queue) : null
  },
})

export const getQueueStatusForIdentity = internalQuery({
  args: {
    platform: queuePlatformValidator,
    platformUserId: v.string(),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await getQueueDocOrThrow(ctx, args.queueId)

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

    const queue = await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (query) =>
        query.eq("creatorUserId", user._id)
      )
      .unique()

    return queue ? normalizeViewerQueue(queue) : null
  },
})

export const getCurrentCreatorQueueEntries = query({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedCreatorQueueAccess(ctx, args.queueId)

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (query) =>
        query.eq("queueId", args.queueId)
      )
      .collect()

    return entries.map(normalizeViewerQueueEntry)
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

    return normalizeViewerQueueRound(round)
  },
})
