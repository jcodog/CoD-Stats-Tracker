import { v } from "convex/values"
import {
  RANK_WEIGHTS,
  type RankValue,
} from "../../../lib/playingWithViewers"
import { internalMutation } from "../../../_generated/server"

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
const inviteCodeTypeValidator = v.union(
  v.literal("party_code"),
  v.literal("private_match_code")
)
const selectedQueueUserValidator = v.object({
  discordUserId: v.string(),
  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  rank: rankValidator,
  dmStatus: v.optional(v.union(v.literal("sent"), v.literal("failed"))),
  dmFailureReason: v.optional(v.string()),
})
const MIN_PLAYERS_PER_BATCH = 1
const MAX_PLAYERS_PER_BATCH = 30
const MIN_MATCHES_PER_VIEWER = 1
const MAX_MATCHES_PER_VIEWER = 10

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

const validateQueueVolumeSettings = (args: {
  matchesPerViewer: number
  playersPerBatch: number
}) => {
  if (args.playersPerBatch < MIN_PLAYERS_PER_BATCH) {
    throw new Error(`playersPerBatch must be at least ${MIN_PLAYERS_PER_BATCH}`)
  }

  if (args.playersPerBatch > MAX_PLAYERS_PER_BATCH) {
    throw new Error(`playersPerBatch cannot exceed ${MAX_PLAYERS_PER_BATCH}`)
  }

  if (args.matchesPerViewer < MIN_MATCHES_PER_VIEWER) {
    throw new Error(
      `matchesPerViewer must be at least ${MIN_MATCHES_PER_VIEWER}`
    )
  }

  if (args.matchesPerViewer > MAX_MATCHES_PER_VIEWER) {
    throw new Error(
      `matchesPerViewer cannot exceed ${MAX_MATCHES_PER_VIEWER}`
    )
  }
}

export const createQueue = internalMutation({
  args: {
    creatorUserId: v.id("users"),
    guildId: v.string(),
    guildName: v.optional(v.string()),
    channelId: v.string(),
    channelName: v.optional(v.string()),
    channelPermsCorrect: v.optional(v.boolean()),
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
    validateQueueVolumeSettings(args)

    if (!isRankRangeValid(args.minRank, args.maxRank)) {
      throw new Error("minRank cannot be higher than maxRank")
    }

    const guildId = requireNonEmptyString(args.guildId, "guildId")
    const channelId = requireNonEmptyString(args.channelId, "channelId")
    const guildName = args.guildName?.trim() || undefined
    const channelName = args.channelName?.trim() || undefined
    const channelPermsCorrect = args.channelPermsCorrect
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
      guildName,
      channelId,
      channelName,
      channelPermsCorrect,
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

export const enqueueViewer = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    discordUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
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
      return {
        entryId: existingEntry._id,
        status: "already_joined" as const,
      }
    }

    const entryId = await ctx.db.insert("viewerQueueEntries", {
      queueId: args.queueId,
      discordUserId,
      username,
      displayName,
      avatarUrl: args.avatarUrl?.trim() || undefined,
      rank: args.rank,
      joinedAt: Date.now(),
    })

    return {
      entryId,
      status: "enqueued" as const,
    }
  },
})

export const selectNextBatch = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    inviteCode: v.optional(v.string()),
    inviteCodeType: v.optional(inviteCodeTypeValidator),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const inviteCode = args.inviteCode?.trim()

    if (queue.inviteMode === "discord_dm" && !inviteCode) {
      throw new Error("Invite code is required for discord_dm mode")
    }

    if (queue.inviteMode === "discord_dm" && !args.inviteCodeType) {
      throw new Error("Invite code type is required for discord_dm mode")
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
      avatarUrl: entry.avatarUrl,
      rank: entry.rank,
    }))

    for (const entry of selectedEntries) {
      await ctx.db.delete(entry._id)
    }

    const now = Date.now()

    const roundId = await ctx.db.insert("viewerQueueRounds", {
      queueId: args.queueId,
      mode: queue.inviteMode,
      lobbyCode: inviteCode || undefined,
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

export const inviteQueueEntryNow = internalMutation({
  args: {
    entryId: v.id("viewerQueueEntries"),
    inviteCode: v.optional(v.string()),
    inviteCodeType: v.optional(inviteCodeTypeValidator),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)

    if (!entry) {
      throw new Error("Queue entry not found")
    }

    const queue = await ctx.db.get(entry.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const inviteCode = args.inviteCode?.trim()

    if (queue.inviteMode === "discord_dm" && !inviteCode) {
      throw new Error("Invite code is required for discord_dm mode")
    }

    if (queue.inviteMode === "discord_dm" && !args.inviteCodeType) {
      throw new Error("Invite code type is required for discord_dm mode")
    }

    const selectedUsers = [
      {
        discordUserId: entry.discordUserId,
        username: entry.username,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        rank: entry.rank,
      },
    ]

    await ctx.db.delete(entry._id)

    const now = Date.now()

    const roundId = await ctx.db.insert("viewerQueueRounds", {
      queueId: queue._id,
      mode: queue.inviteMode,
      lobbyCode: inviteCode || undefined,
      selectedUsers,
      selectedCount: selectedUsers.length,
      createdAt: now,
    })

    await ctx.db.patch(queue._id, {
      lastSelectedRoundId: roundId,
      updatedAt: now,
    })

    return {
      queueId: queue._id,
      roundId,
      selectedCount: selectedUsers.length,
      selectedUsers,
    }
  },
})

export const setQueueActive = internalMutation({
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

export const leaveQueue = internalMutation({
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

export const removeQueueEntry = internalMutation({
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

export const clearQueue = internalMutation({
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

export const updateQueueSettings = internalMutation({
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

    validateQueueVolumeSettings(args)

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

export const setQueueMessageMeta = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      messageId: args.messageId.trim(),
      lastMessageSyncError: undefined,
      updatedAt: Date.now(),
    })

    return { queueId: args.queueId }
  },
})

export const clearQueueMessageMeta = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      lastMessageSyncError: undefined,
      messageId: undefined,
      updatedAt: Date.now(),
    })

    return { queueId: args.queueId }
  },
})

export const setQueueMessageSyncError = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      lastMessageSyncError: args.error.trim(),
      updatedAt: Date.now(),
    })

    return { queueId: args.queueId }
  },
})

export const clearQueueMessageSyncError = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      lastMessageSyncError: undefined,
      updatedAt: Date.now(),
    })

    return { queueId: args.queueId }
  },
})

export const setQueueDiscordContext = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    guildName: v.optional(v.string()),
    channelId: v.optional(v.string()),
    channelName: v.optional(v.string()),
    channelPermsCorrect: v.optional(v.boolean()),
    resetMessageState: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const channelId = args.channelId?.trim()

    await ctx.db.patch(args.queueId, {
      channelId: channelId || queue.channelId,
      guildName: args.guildName?.trim() || undefined,
      channelName: args.channelName?.trim() || undefined,
      channelPermsCorrect: args.channelPermsCorrect,
      ...(args.resetMessageState
        ? {
            lastMessageSyncError: undefined,
            messageId: undefined,
          }
        : {}),
      updatedAt: Date.now(),
    })

    return { queueId: args.queueId }
  },
})

export const setQueueRoundSelectedUsers = internalMutation({
  args: {
    roundId: v.id("viewerQueueRounds"),
    selectedUsers: v.array(selectedQueueUserValidator),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId)

    if (!round) {
      throw new Error("Queue round not found")
    }

    await ctx.db.patch(args.roundId, {
      selectedCount: args.selectedUsers.length,
      selectedUsers: args.selectedUsers,
    })

    return {
      roundId: args.roundId,
      selectedCount: args.selectedUsers.length,
    }
  },
})
