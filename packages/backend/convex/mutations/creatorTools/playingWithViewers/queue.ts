import { v } from "convex/values"
import {
  RANK_WEIGHTS,
  type RankValue,
} from "../../../../src/lib/playingWithViewers"
import { mutation } from "../../../_generated/server"

const rankValidator = v.union(
  v.literal("bronze"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("platinum"),
  v.literal("diamond"),
  v.literal("crimson"),
  v.literal("iridescent"),
  v.literal("top250")
)

const inviteModeValidator = v.union(
  v.literal("discord_dm"),
  v.literal("manual_creator_contact")
)

const getRankWeight = (rank: RankValue): number => {
  return RANK_WEIGHTS[rank]
}

const isRankRangeValid = (minRank: RankValue, maxRank: RankValue): boolean => {
  return getRankWeight(minRank) <= getRankWeight(maxRank)
}

const isRankInRange = (
  rank: RankValue,
  minRank: RankValue,
  maxRank: RankValue
): boolean => {
  const weight = getRankWeight(rank)
  return weight >= getRankWeight(minRank) && weight <= getRankWeight(maxRank)
}

const requireNonEmptyString = (value: string, fieldName: string): string => {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${fieldName} is required`)
  }

  return trimmed
}

export const createQueue = mutation({
  args: {
    creatorUserId: v.id("users"),
    guildId: v.string(),
    channelId: v.string(),
    title: v.string(),
    creatorDisplayName: v.string(),
    gameLabel: v.string(),
    creatorMessage: v.optional(v.string()),
    rulesText: v.optional(v.string()),
    playersPerBatch: v.number(),
    matchesPerViewer: v.number(),
    minRank: rankValidator,
    maxRank: rankValidator,
    inviteMode: inviteModeValidator,
  },
  handler: async (ctx, args) => {
    if (args.playersPerBatch < 1) {
      throw new Error("playersPerBatch must be at least 1")
    }

    if (args.matchesPerViewer < 1) {
      throw new Error("matchesPerViewer must be at least 1")
    }

    if (!isRankRangeValid(args.minRank, args.maxRank)) {
      throw new Error("minRank cannot be higher than maxRank")
    }

    const guildId = requireNonEmptyString(args.guildId, "guildId")
    const channelId = requireNonEmptyString(args.channelId, "channelId")
    const title = requireNonEmptyString(args.title, "title")
    const creatorDisplayName = requireNonEmptyString(
      args.creatorDisplayName,
      "creatorDisplayName"
    )
    const gameLabel = requireNonEmptyString(args.gameLabel, "gameLabel")

    const existing = await ctx.db
      .query("viewerQueues")
      .withIndex("by_guildId_and_channelId", (q) =>
        q.eq("guildId", guildId).eq("channelId", channelId)
      )
      .first()

    if (existing) {
      throw new Error("A queue already exists for this guild and channel")
    }

    const now = Date.now()

    const queueId = await ctx.db.insert("viewerQueues", {
      creatorUserId: args.creatorUserId,
      guildId,
      channelId,
      title,
      creatorDisplayName,
      gameLabel,
      creatorMessage: args.creatorMessage?.trim() || undefined,
      rulesText: args.rulesText?.trim() || undefined,
      isActive: false,
      playersPerBatch: args.playersPerBatch,
      matchesPerViewer: args.matchesPerViewer,
      minRank: args.minRank,
      maxRank: args.maxRank,
      inviteMode: args.inviteMode,
      createdAt: now,
      updatedAt: now,
    })

    return { queueId }
  },
})

export const enqueueViewer = mutation({
  args: {
    queueId: v.id("viewerQueues"),
    discordUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    rank: rankValidator,
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    if (!queue.isActive) {
      throw new Error("Queue is not active")
    }

    const discordUserId = requireNonEmptyString(
      args.discordUserId,
      "discordUserId"
    )
    const username = requireNonEmptyString(args.username, "username")
    const displayName = requireNonEmptyString(args.displayName, "displayName")

    const existingEntry = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_discordUserId", (q) =>
        q.eq("queueId", args.queueId).eq("discordUserId", discordUserId)
      )
      .first()

    if (existingEntry) {
      throw new Error("Viewer is already in the queue")
    }

    const entryId = await ctx.db.insert("viewerQueueEntries", {
      queueId: args.queueId,
      discordUserId,
      username,
      displayName,
      rank: args.rank,
      joinedAt: Date.now(),
    })

    return { entryId }
  },
})

export const selectNextBatch = mutation({
  args: {
    queueId: v.id("viewerQueues"),
    lobbyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const lobbyCode = args.lobbyCode?.trim()

    if (queue.inviteMode === "discord_dm" && !lobbyCode) {
      throw new Error("Lobby code is required for discord_dm mode")
    }

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (q) =>
        q.eq("queueId", args.queueId)
      )
      .collect()

    const selectedEntries = entries
      .filter((entry) =>
        isRankInRange(entry.rank, queue.minRank, queue.maxRank)
      )
      .slice(0, queue.playersPerBatch)

    if (selectedEntries.length === 0) {
      throw new Error("No eligible viewers found")
    }

    const selectedUsers = selectedEntries.map((entry) => ({
      discordUserId: entry.discordUserId,
      username: entry.username,
      displayName: entry.displayName,
      rank: entry.rank,
    }))

    for (const entry of selectedEntries) {
      await ctx.db.delete(entry._id)
    }

    const now = Date.now()

    const roundId = await ctx.db.insert("viewerQueueRounds", {
      queueId: args.queueId,
      mode: queue.inviteMode,
      lobbyCode: lobbyCode || undefined,
      selectedUsers,
      selectedCount: selectedUsers.length,
      createdAt: now,
    })

    await ctx.db.patch(queue._id, {
      lastSelectedRoundId: roundId,
      updatedAt: now,
    })

    return {
      roundId,
      selectedCount: selectedUsers.length,
      selectedUsers,
    }
  },
})

export const setQueueActive = mutation({
  args: {
    queueId: v.id("viewerQueues"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    })

    return {
      queueId: args.queueId,
      isActive: args.isActive,
    }
  },
})

export const leaveQueue = mutation({
  args: {
    queueId: v.id("viewerQueues"),
    discordUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const discordUserId = requireNonEmptyString(
      args.discordUserId,
      "discordUserId"
    )

    const entry = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_discordUserId", (q) =>
        q.eq("queueId", args.queueId).eq("discordUserId", discordUserId)
      )
      .first()

    if (!entry) {
      throw new Error("Viewer is not in the queue")
    }

    await ctx.db.delete(entry._id)

    return {
      removed: true,
      entryId: entry._id,
    }
  },
})

export const removeQueueEntry = mutation({
  args: {
    entryId: v.id("viewerQueueEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)

    if (!entry) {
      throw new Error("Queue entry not found")
    }

    await ctx.db.delete(args.entryId)

    return {
      removed: true,
      entryId: args.entryId,
      queueId: entry.queueId,
    }
  },
})

export const clearQueue = mutation({
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
      .withIndex("by_queueId", (q) => q.eq("queueId", args.queueId))
      .collect()

    for (const entry of entries) {
      await ctx.db.delete(entry._id)
    }

    await ctx.db.patch(args.queueId, {
      updatedAt: Date.now(),
    })

    return {
      clearedCount: entries.length,
      queueId: args.queueId,
    }
  },
})

export const updateQueueSettings = mutation({
  args: {
    queueId: v.id("viewerQueues"),
    title: v.string(),
    creatorDisplayName: v.string(),
    gameLabel: v.string(),
    creatorMessage: v.optional(v.string()),
    rulesText: v.optional(v.string()),
    playersPerBatch: v.number(),
    matchesPerViewer: v.number(),
    minRank: rankValidator,
    maxRank: rankValidator,
    inviteMode: inviteModeValidator,
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    if (args.playersPerBatch < 1) {
      throw new Error("playersPerBatch must be at least 1")
    }

    if (args.matchesPerViewer < 1) {
      throw new Error("matchesPerViewer must be at least 1")
    }

    if (!isRankRangeValid(args.minRank, args.maxRank)) {
      throw new Error("minRank cannot be higher than maxRank")
    }

    const title = requireNonEmptyString(args.title, "title")
    const creatorDisplayName = requireNonEmptyString(
      args.creatorDisplayName,
      "creatorDisplayName"
    )
    const gameLabel = requireNonEmptyString(args.gameLabel, "gameLabel")

    await ctx.db.patch(args.queueId, {
      title,
      creatorDisplayName,
      gameLabel,
      creatorMessage: args.creatorMessage?.trim() || undefined,
      rulesText: args.rulesText?.trim() || undefined,
      playersPerBatch: args.playersPerBatch,
      matchesPerViewer: args.matchesPerViewer,
      minRank: args.minRank,
      maxRank: args.maxRank,
      inviteMode: args.inviteMode,
      updatedAt: Date.now(),
    })

    return {
      queueId: args.queueId,
    }
  },
})
