import { v } from "convex/values"
import { Doc } from "../../../_generated/dataModel"
import {
  RANK_WEIGHTS,
  type RankValue,
} from "../../../../src/lib/playingWithViewers"
import { mutation } from "../../../_generated/server"

type InviteMode = Doc<"viewerQueues">["inviteMode"]

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

    const existing = await ctx.db
      .query("viewerQueues")
      .withIndex("by_guildId_and_channelId", (q) =>
        q.eq("guildId", args.guildId).eq("channelId", args.channelId)
      )
      .first()

    if (existing) {
      throw new Error("A queue already exists for this guild and channel")
    }

    const now = Date.now()

    const queueId = await ctx.db.insert("viewerQueues", {
      creatorUserId: args.creatorUserId,
      guildId: args.guildId,
      channelId: args.channelId,
      title: args.title.trim(),
      creatorDisplayName: args.creatorDisplayName.trim(),
      gameLabel: args.gameLabel.trim(),
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

    const existingEntry = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_discordUserId", (q) =>
        q.eq("queueId", args.queueId).eq("discordUserId", args.discordUserId)
      )
      .first()

    if (existingEntry) {
      throw new Error("Viewer is already in the queue")
    }

    const entryId = await ctx.db.insert("viewerQueueEntries", {
      queueId: args.queueId,
      discordUserId: args.discordUserId,
      username: args.username.trim(),
      displayName: args.displayName.trim(),
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
      mode: queue.inviteMode as InviteMode,
      lobbyCode: args.lobbyCode?.trim() || undefined,
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
