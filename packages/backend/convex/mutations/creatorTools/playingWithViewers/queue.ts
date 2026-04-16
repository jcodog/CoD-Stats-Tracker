import { v } from "convex/values"
import { internalMutation } from "../../../_generated/server"
import type { Id } from "../../../_generated/dataModel"
import type { MutationCtx } from "../../../_generated/server"
import {
  RANK_WEIGHTS,
  inviteCodeTypeValidator,
  inviteModeValidator,
  queueNotificationMethodValidator,
  queuePlatformValidator,
  rankValidator,
  type QueuePlatform,
  type RankValue,
} from "../../../lib/playingWithViewers"

const selectedQueueUserValidator = v.object({
  platform: queuePlatformValidator,
  platformUserId: v.string(),
  discordUserId: v.optional(v.string()),
  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  linkedUserId: v.optional(v.id("users")),
  rank: rankValidator,
  notificationMethod: v.optional(queueNotificationMethodValidator),
  notificationStatus: v.optional(
    v.union(v.literal("sent"), v.literal("failed"))
  ),
  notificationFailureReason: v.optional(v.string()),
  dmStatus: v.optional(v.union(v.literal("sent"), v.literal("failed"))),
  dmFailureReason: v.optional(v.string()),
})

const MIN_PLAYERS_PER_BATCH = 1
const MAX_PLAYERS_PER_BATCH = 30
const MIN_MATCHES_PER_VIEWER = 1
const MAX_MATCHES_PER_VIEWER = 10
const JOIN_COOLDOWN_MS = 10 * 60 * 1000

type QueueMutationCtx = MutationCtx

type QueueJoinResult =
  | {
      entryId: Id<"viewerQueueEntries">
      status: "enqueued" | "already_joined"
      cooldownRemainingMs?: never
    }
  | {
      entryId: undefined
      status: "cooldown"
      cooldownRemainingMs: number
    }

const getRankWeight = (rank: RankValue): number => RANK_WEIGHTS[rank]

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
    throw new Error(`matchesPerViewer cannot exceed ${MAX_MATCHES_PER_VIEWER}`)
  }
}

async function getLinkedUserIdForPlatformIdentity(
  ctx: QueueMutationCtx,
  args: { platform: QueuePlatform; platformUserId: string }
): Promise<Id<"users"> | undefined> {
  const connection = await ctx.db
    .query("connectedAccounts")
    .withIndex("by_provider_and_providerUserId", (q) =>
      q.eq("provider", args.platform).eq("providerUserId", args.platformUserId)
    )
    .unique()

  return connection?.userId
}

async function getExistingCooldown(
  ctx: QueueMutationCtx,
  args: {
    queueId: Id<"viewerQueues">
    platform: QueuePlatform
    platformUserId: string
  }
) {
  return await ctx.db
    .query("viewerQueueCooldowns")
    .withIndex("by_queueId_platformUserId_command", (q) =>
      q
        .eq("queueId", args.queueId)
        .eq("platform", args.platform)
        .eq("platformUserId", args.platformUserId)
        .eq("command", "join")
    )
    .first()
}

async function upsertJoinCooldown(
  ctx: QueueMutationCtx,
  args: {
    queueId: Id<"viewerQueues">
    platform: QueuePlatform
    platformUserId: string
    now: number
  }
): Promise<void> {
  const existing = await getExistingCooldown(ctx, args)

  if (!existing) {
    await ctx.db.insert("viewerQueueCooldowns", {
      queueId: args.queueId,
      platform: args.platform,
      platformUserId: args.platformUserId,
      command: "join",
      lastUsedAt: args.now,
    })
    return
  }

  await ctx.db.patch(existing._id, {
    lastUsedAt: args.now,
  })
}

function mapEntryToSelectedUser(entry: {
  platform: QueuePlatform
  platformUserId: string
  discordUserId?: string
  username: string
  displayName: string
  avatarUrl?: string
  linkedUserId?: Id<"users">
  rank: RankValue
}) {
  return {
    platform: entry.platform,
    platformUserId: entry.platformUserId,
    discordUserId: entry.discordUserId,
    username: entry.username,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    linkedUserId: entry.linkedUserId,
    rank: entry.rank,
    notificationMethod: undefined,
    notificationStatus: undefined,
    notificationFailureReason: undefined,
    dmStatus: undefined,
    dmFailureReason: undefined,
  }
}

async function enqueueViewerFromPlatformCore(
  ctx: QueueMutationCtx,
  args: {
    queueId: Id<"viewerQueues">
    platform: QueuePlatform
    platformUserId: string
    username: string
    displayName: string
    avatarUrl?: string
    rank: RankValue
  }
): Promise<QueueJoinResult> {
  const queue = await ctx.db.get(args.queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  if (!queue.isActive) {
    throw new Error("Queue is not active")
  }

  const platformUserId = requireNonEmptyString(
    args.platformUserId,
    "platformUserId"
  )
  const username = requireNonEmptyString(args.username, "username")
  const displayName = requireNonEmptyString(args.displayName, "displayName")

  const existingCooldown = await getExistingCooldown(ctx, {
    queueId: args.queueId,
    platform: args.platform,
    platformUserId,
  })

  const now = Date.now()

  if (
    existingCooldown &&
    now - existingCooldown.lastUsedAt < JOIN_COOLDOWN_MS
  ) {
    return {
      entryId: undefined,
      status: "cooldown",
      cooldownRemainingMs:
        JOIN_COOLDOWN_MS - (now - existingCooldown.lastUsedAt),
    }
  }

  const linkedUserId = await getLinkedUserIdForPlatformIdentity(ctx, {
    platform: args.platform,
    platformUserId,
  })

  const existingEntry = await ctx.db
    .query("viewerQueueEntries")
    .withIndex("by_queueId_and_platformUserId", (q) =>
      q
        .eq("queueId", args.queueId)
        .eq("platform", args.platform)
        .eq("platformUserId", platformUserId)
    )
    .first()

  if (existingEntry) {
    return {
      entryId: existingEntry._id,
      status: "already_joined",
    }
  }

  if (linkedUserId) {
    const linkedEntries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_linkedUserId", (q) => q.eq("linkedUserId", linkedUserId))
      .collect()

    const existingLinkedEntry = linkedEntries.find(
      (entry) => entry.queueId === args.queueId
    )

    if (existingLinkedEntry) {
      return {
        entryId: existingLinkedEntry._id,
        status: "already_joined",
      }
    }
  }

  const entryId = await ctx.db.insert("viewerQueueEntries", {
    queueId: args.queueId,
    platform: args.platform,
    platformUserId,
    discordUserId: args.platform === "discord" ? platformUserId : undefined,
    username,
    displayName,
    avatarUrl: args.avatarUrl?.trim() || undefined,
    linkedUserId,
    rank: args.rank,
    joinedAt: now,
  })

  await upsertJoinCooldown(ctx, {
    queueId: args.queueId,
    platform: args.platform,
    platformUserId,
    now,
  })

  return {
    entryId,
    status: "enqueued",
  }
}

async function leaveQueueFromPlatformCore(
  ctx: QueueMutationCtx,
  args: {
    queueId: Id<"viewerQueues">
    platform: QueuePlatform
    platformUserId: string
  }
): Promise<{ removed: true; entryId: Id<"viewerQueueEntries"> }> {
  const queue = await ctx.db.get(args.queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  const platformUserId = requireNonEmptyString(
    args.platformUserId,
    "platformUserId"
  )

  const entry = await ctx.db
    .query("viewerQueueEntries")
    .withIndex("by_queueId_and_platformUserId", (q) =>
      q
        .eq("queueId", args.queueId)
        .eq("platform", args.platform)
        .eq("platformUserId", platformUserId)
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
}

export const createQueue = internalMutation({
  args: {
    creatorUserId: v.id("users"),
    guildId: v.string(),
    guildName: v.optional(v.string()),
    channelId: v.string(),
    channelName: v.optional(v.string()),
    channelPermsCorrect: v.optional(v.boolean()),
    twitchBroadcasterId: v.string(),
    twitchBroadcasterLogin: v.string(),
    twitchCommandsEnabled: v.optional(v.boolean()),
    twitchBotAnnouncementsEnabled: v.optional(v.boolean()),
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
    const twitchBroadcasterId = requireNonEmptyString(
      args.twitchBroadcasterId,
      "twitchBroadcasterId"
    )
    const twitchBroadcasterLogin = requireNonEmptyString(
      args.twitchBroadcasterLogin,
      "twitchBroadcasterLogin"
    )
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
      .withIndex("by_creatorUserId", (q) =>
        q.eq("creatorUserId", args.creatorUserId)
      )
      .first()

    if (existing) {
      throw new Error("A queue already exists for this creator")
    }

    const now = Date.now()

    const queueId = await ctx.db.insert("viewerQueues", {
      creatorUserId: args.creatorUserId,
      guildId,
      guildName,
      channelId,
      channelName,
      channelPermsCorrect,
      twitchBroadcasterId,
      twitchBroadcasterLogin,
      twitchCommandsEnabled: args.twitchCommandsEnabled ?? true,
      twitchBotAnnouncementsEnabled: args.twitchBotAnnouncementsEnabled ?? true,
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
    const result = await enqueueViewerFromPlatformCore(ctx, {
      queueId: args.queueId,
      platform: "discord",
      platformUserId: args.discordUserId,
      username: args.username,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      rank: args.rank,
    })

    return {
      entryId: result.entryId,
      status: result.status,
      cooldownRemainingMs: result.cooldownRemainingMs,
    }
  },
})

export const enqueueViewerFromPlatform = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    platform: queuePlatformValidator,
    platformUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    rank: rankValidator,
  },
  handler: async (ctx, args) => {
    return await enqueueViewerFromPlatformCore(ctx, args)
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

    if (queue.inviteMode === "bot_dm" && !inviteCode) {
      throw new Error("Invite code is required for bot_dm mode")
    }

    if (queue.inviteMode === "bot_dm" && !args.inviteCodeType) {
      throw new Error("Invite code type is required for bot_dm mode")
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

    const selectedUsers = selectedEntries.map(mapEntryToSelectedUser)

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

    if (queue.inviteMode === "bot_dm" && !inviteCode) {
      throw new Error("Invite code is required for bot_dm mode")
    }

    if (queue.inviteMode === "bot_dm" && !args.inviteCodeType) {
      throw new Error("Invite code type is required for bot_dm mode")
    }

    const selectedUsers = [mapEntryToSelectedUser(entry)]

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
    return await leaveQueueFromPlatformCore(ctx, {
      queueId: args.queueId,
      platform: "discord",
      platformUserId: args.discordUserId,
    })
  },
})

export const leaveQueueFromPlatform = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    platform: queuePlatformValidator,
    platformUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await leaveQueueFromPlatformCore(ctx, args)
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
    twitchBroadcasterId: v.optional(v.string()),
    twitchBroadcasterLogin: v.optional(v.string()),
    twitchCommandsEnabled: v.optional(v.boolean()),
    twitchBotAnnouncementsEnabled: v.optional(v.boolean()),
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
      twitchBroadcasterId:
        args.twitchBroadcasterId !== undefined
          ? requireNonEmptyString(
              args.twitchBroadcasterId,
              "twitchBroadcasterId"
            )
          : queue.twitchBroadcasterId,
      twitchBroadcasterLogin:
        args.twitchBroadcasterLogin !== undefined
          ? requireNonEmptyString(
              args.twitchBroadcasterLogin,
              "twitchBroadcasterLogin"
            )
          : queue.twitchBroadcasterLogin,
      twitchCommandsEnabled:
        args.twitchCommandsEnabled ?? queue.twitchCommandsEnabled,
      twitchBotAnnouncementsEnabled:
        args.twitchBotAnnouncementsEnabled ??
        queue.twitchBotAnnouncementsEnabled,
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

export const setQueueTwitchContext = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    twitchBroadcasterId: v.string(),
    twitchBroadcasterLogin: v.string(),
    twitchCommandsEnabled: v.optional(v.boolean()),
    twitchBotAnnouncementsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      twitchBroadcasterId: requireNonEmptyString(
        args.twitchBroadcasterId,
        "twitchBroadcasterId"
      ),
      twitchBroadcasterLogin: requireNonEmptyString(
        args.twitchBroadcasterLogin,
        "twitchBroadcasterLogin"
      ),
      twitchCommandsEnabled:
        args.twitchCommandsEnabled ?? queue.twitchCommandsEnabled,
      twitchBotAnnouncementsEnabled:
        args.twitchBotAnnouncementsEnabled ??
        queue.twitchBotAnnouncementsEnabled,
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

export const recordRoundNotificationResult = internalMutation({
  args: {
    roundId: v.id("viewerQueueRounds"),
    platform: queuePlatformValidator,
    platformUserId: v.string(),
    notificationMethod: queueNotificationMethodValidator,
    notificationStatus: v.union(v.literal("sent"), v.literal("failed")),
    notificationFailureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId)

    if (!round) {
      throw new Error("Queue round not found")
    }

    const normalizedPlatformUserId = args.platformUserId.trim()

    const nextSelectedUsers = round.selectedUsers.map((user) => {
      if (
        user.platform !== args.platform ||
        user.platformUserId !== normalizedPlatformUserId
      ) {
        return user
      }

      return {
        ...user,
        notificationMethod: args.notificationMethod,
        notificationStatus: args.notificationStatus,
        notificationFailureReason:
          args.notificationFailureReason?.trim() || undefined,
        dmStatus:
          args.notificationMethod === "discord_dm"
            ? args.notificationStatus
            : user.dmStatus,
        dmFailureReason:
          args.notificationMethod === "discord_dm"
            ? args.notificationFailureReason?.trim() || undefined
            : user.dmFailureReason,
      }
    })

    await ctx.db.patch(args.roundId, {
      selectedUsers: nextSelectedUsers,
      selectedCount: nextSelectedUsers.length,
    })

    return {
      roundId: args.roundId,
    }
  },
})
