import { v } from "convex/values"
import { internalMutation } from "../../../_generated/server"
import type { Id } from "../../../_generated/dataModel"
import type { MutationCtx } from "../../../_generated/server"
import {
  findQueueEntryForIdentity,
  resolveQueueIdentity,
} from "../../../../src/lib/playingWithViewersIdentity"
import {
  DEFAULT_INVITE_CODE_TYPE,
  inviteCodeTypeValidator,
  inviteModeValidator,
  normalizeStoredQueueParticipant,
  normalizeStoredInviteMode,
  isParticipantRankEligible,
  participantQueueRankValidator,
  queueConfigRankValidator,
  queueNotificationMethodValidator,
  queueNotificationStatusValidator,
  queuePlatformValidator,
  RANK_WEIGHTS,
  type ParticipantRankValue,
  type QueueConfigRankValue,
  type QueuePlatform,
} from "../../../../src/lib/playingWithViewers"
import {
  getDisabledPlayWithViewersTwitchContext,
  type PlayWithViewersStoredTwitchContextLike,
  isPlayWithViewersTwitchEnabled,
} from "../../../../src/lib/creatorToolsConfig"

const selectedQueueUserValidator = v.object({
  platform: queuePlatformValidator,
  platformUserId: v.string(),
  discordUserId: v.optional(v.string()),
  username: v.string(),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  linkedUserId: v.optional(v.id("users")),
  rank: participantQueueRankValidator,
  notificationMethod: v.optional(queueNotificationMethodValidator),
  notificationStatus: v.optional(queueNotificationStatusValidator),
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

const getRankWeight = (rank: QueueConfigRankValue): number => RANK_WEIGHTS[rank]

const isRankRangeValid = (
  minRank: QueueConfigRankValue,
  maxRank: QueueConfigRankValue
): boolean => {
  return getRankWeight(minRank) <= getRankWeight(maxRank)
}

const requireNonEmptyString = (value: string, fieldName: string): string => {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${fieldName} is required`)
  }

  return trimmed
}

function resolveStoredTwitchContext(args: {
  currentQueue?: PlayWithViewersStoredTwitchContextLike
  twitchBotAnnouncementsEnabled?: boolean
  twitchBroadcasterId?: string
  twitchBroadcasterLogin?: string
  twitchCommandsEnabled?: boolean
}) {
  if (!isPlayWithViewersTwitchEnabled()) {
    return getDisabledPlayWithViewersTwitchContext()
  }

  return {
    twitchBotAnnouncementsEnabled:
      args.twitchBotAnnouncementsEnabled ??
      args.currentQueue?.twitchBotAnnouncementsEnabled ??
      true,
    twitchBroadcasterId: requireNonEmptyString(
      args.twitchBroadcasterId ?? args.currentQueue?.twitchBroadcasterId ?? "",
      "twitchBroadcasterId"
    ),
    twitchBroadcasterLogin: requireNonEmptyString(
      args.twitchBroadcasterLogin ??
        args.currentQueue?.twitchBroadcasterLogin ??
        "",
      "twitchBroadcasterLogin"
    ),
    twitchCommandsEnabled:
      args.twitchCommandsEnabled ??
      args.currentQueue?.twitchCommandsEnabled ??
      true,
  }
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
    .withIndex("by_queueId_platformUserId_command", (query) =>
      query
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
      command: "join",
      lastUsedAt: args.now,
      platform: args.platform,
      platformUserId: args.platformUserId,
      queueId: args.queueId,
    })
    return
  }

  await ctx.db.patch(existing._id, {
    lastUsedAt: args.now,
  })
}

function mapEntryToSelectedUser(entry: {
  avatarUrl?: string
  discordUserId?: string
  displayName: string
  linkedUserId?: Id<"users">
  platform?: QueuePlatform
  platformUserId?: string
  rank: ParticipantRankValue
  username: string
}) {
  const normalizedEntry = normalizeStoredQueueParticipant(entry)

  return {
    avatarUrl: normalizedEntry.avatarUrl,
    displayName: normalizedEntry.displayName,
    discordUserId: normalizedEntry.discordUserId,
    dmFailureReason: undefined,
    dmStatus: undefined,
    linkedUserId: normalizedEntry.linkedUserId,
    notificationFailureReason: undefined,
    notificationMethod: undefined,
    notificationStatus: undefined,
    platform: normalizedEntry.platform,
    platformUserId: normalizedEntry.platformUserId,
    rank: normalizedEntry.rank,
    username: normalizedEntry.username,
  }
}

async function enqueueViewerFromPlatformCore(
  ctx: QueueMutationCtx,
  args: {
    avatarUrl?: string
    displayName: string
    platform: QueuePlatform
    platformUserId: string
    queueId: Id<"viewerQueues">
    rank: ParticipantRankValue
    username: string
  }
): Promise<QueueJoinResult> {
  const queue = await ctx.db.get(args.queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  if (!queue.isActive) {
    throw new Error("Queue is not active")
  }

  const username = requireNonEmptyString(args.username, "username")
  const displayName = requireNonEmptyString(args.displayName, "displayName")
  const identity = await resolveQueueIdentity(ctx, {
    platform: args.platform,
    platformUserId: args.platformUserId,
  })
  const existingEntry = await findQueueEntryForIdentity(ctx, {
    linkedUserId: identity.linkedUserId,
    platform: identity.platform,
    platformUserId: identity.platformUserId,
    queueId: args.queueId,
  })

  if (existingEntry) {
    return {
      entryId: existingEntry._id,
      status: "already_joined",
    }
  }

  const existingCooldown = await getExistingCooldown(ctx, {
    platform: identity.platform,
    platformUserId: identity.platformUserId,
    queueId: args.queueId,
  })
  const now = Date.now()

  if (
    existingCooldown &&
    now - existingCooldown.lastUsedAt < JOIN_COOLDOWN_MS
  ) {
    return {
      cooldownRemainingMs:
        JOIN_COOLDOWN_MS - (now - existingCooldown.lastUsedAt),
      entryId: undefined,
      status: "cooldown",
    }
  }

  const entryId = await ctx.db.insert("viewerQueueEntries", {
    avatarUrl: args.avatarUrl?.trim() || undefined,
    displayName,
    discordUserId:
      identity.platform === "discord" ? identity.platformUserId : undefined,
    joinedAt: now,
    linkedUserId: identity.linkedUserId,
    platform: identity.platform,
    platformUserId: identity.platformUserId,
    queueId: args.queueId,
    rank: args.rank,
    username,
  })

  await upsertJoinCooldown(ctx, {
    now,
    platform: identity.platform,
    platformUserId: identity.platformUserId,
    queueId: args.queueId,
  })

  return {
    entryId,
    status: "enqueued",
  }
}

async function leaveQueueFromPlatformCore(
  ctx: QueueMutationCtx,
  args: {
    platform: QueuePlatform
    platformUserId: string
    queueId: Id<"viewerQueues">
  }
): Promise<{ entryId: Id<"viewerQueueEntries">; removed: true }> {
  const queue = await ctx.db.get(args.queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  const identity = await resolveQueueIdentity(ctx, {
    platform: args.platform,
    platformUserId: args.platformUserId,
  })
  const entry = await findQueueEntryForIdentity(ctx, {
    linkedUserId: identity.linkedUserId,
    platform: identity.platform,
    platformUserId: identity.platformUserId,
    queueId: args.queueId,
  })

  if (!entry) {
    throw new Error("Viewer is not in the queue")
  }

  await ctx.db.delete(entry._id)

  return {
    entryId: entry._id,
    removed: true,
  }
}

export const createQueue = internalMutation({
  args: {
    channelId: v.string(),
    channelName: v.optional(v.string()),
    channelPermsCorrect: v.optional(v.boolean()),
    creatorDisplayName: v.string(),
    creatorMessage: v.optional(v.string()),
    creatorUserId: v.id("users"),
    gameLabel: v.string(),
    guildId: v.string(),
    guildName: v.optional(v.string()),
    inviteMode: inviteModeValidator,
    matchesPerViewer: v.number(),
    maxRank: queueConfigRankValidator,
    minRank: queueConfigRankValidator,
    playersPerBatch: v.number(),
    rulesText: v.optional(v.string()),
    title: v.string(),
    twitchBotAnnouncementsEnabled: v.optional(v.boolean()),
    twitchBroadcasterId: v.string(),
    twitchBroadcasterLogin: v.string(),
    twitchCommandsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validateQueueVolumeSettings(args)

    if (!isRankRangeValid(args.minRank, args.maxRank)) {
      throw new Error("minRank cannot be higher than maxRank")
    }

    const guildId = requireNonEmptyString(args.guildId, "guildId")
    const channelId = requireNonEmptyString(args.channelId, "channelId")
    const twitchContext = resolveStoredTwitchContext({
      twitchBotAnnouncementsEnabled: args.twitchBotAnnouncementsEnabled,
      twitchBroadcasterId: args.twitchBroadcasterId,
      twitchBroadcasterLogin: args.twitchBroadcasterLogin,
      twitchCommandsEnabled: args.twitchCommandsEnabled,
    })
    const existing = await ctx.db
      .query("viewerQueues")
      .withIndex("by_creatorUserId", (query) =>
        query.eq("creatorUserId", args.creatorUserId)
      )
      .unique()

    if (existing) {
      throw new Error("A queue already exists for this creator")
    }

    const now = Date.now()
    const queueId = await ctx.db.insert("viewerQueues", {
      channelId,
      channelName: args.channelName?.trim() || undefined,
      channelPermsCorrect: args.channelPermsCorrect,
      createdAt: now,
      creatorDisplayName: requireNonEmptyString(
        args.creatorDisplayName,
        "creatorDisplayName"
      ),
      creatorMessage: args.creatorMessage?.trim() || undefined,
      creatorUserId: args.creatorUserId,
      gameLabel: requireNonEmptyString(args.gameLabel, "gameLabel"),
      guildId,
      guildName: args.guildName?.trim() || undefined,
      inviteMode: args.inviteMode,
      isActive: false,
      matchesPerViewer: args.matchesPerViewer,
      maxRank: args.maxRank,
      minRank: args.minRank,
      playersPerBatch: args.playersPerBatch,
      rulesText: args.rulesText?.trim() || undefined,
      title: requireNonEmptyString(args.title, "title"),
      twitchBotAnnouncementsEnabled:
        twitchContext.twitchBotAnnouncementsEnabled,
      twitchBroadcasterId: twitchContext.twitchBroadcasterId,
      twitchBroadcasterLogin: twitchContext.twitchBroadcasterLogin,
      twitchCommandsEnabled: twitchContext.twitchCommandsEnabled,
      updatedAt: now,
    })

    return { queueId }
  },
})

export const enqueueViewer = internalMutation({
  args: {
    avatarUrl: v.optional(v.string()),
    discordUserId: v.string(),
    displayName: v.string(),
    queueId: v.id("viewerQueues"),
    rank: participantQueueRankValidator,
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await enqueueViewerFromPlatformCore(ctx, {
      avatarUrl: args.avatarUrl,
      displayName: args.displayName,
      platform: "discord",
      platformUserId: args.discordUserId,
      queueId: args.queueId,
      rank: args.rank,
      username: args.username,
    })

    return {
      cooldownRemainingMs: result.cooldownRemainingMs,
      entryId: result.entryId,
      status: result.status,
    }
  },
})

export const enqueueViewerFromPlatform = internalMutation({
  args: {
    avatarUrl: v.optional(v.string()),
    displayName: v.string(),
    platform: queuePlatformValidator,
    platformUserId: v.string(),
    queueId: v.id("viewerQueues"),
    rank: participantQueueRankValidator,
    username: v.string(),
  },
  handler: async (ctx, args) => {
    return await enqueueViewerFromPlatformCore(ctx, args)
  },
})

export const selectNextBatch = internalMutation({
  args: {
    inviteCode: v.optional(v.string()),
    inviteCodeType: v.optional(inviteCodeTypeValidator),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const inviteMode = normalizeStoredInviteMode(queue.inviteMode)
    const inviteCode = args.inviteCode?.trim()
    const inviteCodeType = args.inviteCodeType ?? DEFAULT_INVITE_CODE_TYPE

    if (inviteMode === "bot_dm" && !inviteCode) {
      throw new Error("Invite code is required for bot_dm mode")
    }

    if (inviteMode === "bot_dm" && !args.inviteCodeType) {
      throw new Error("Invite code type is required for bot_dm mode")
    }

    const entries = await ctx.db
      .query("viewerQueueEntries")
      .withIndex("by_queueId_and_joinedAt", (query) =>
        query.eq("queueId", args.queueId)
      )
      .collect()

    const selectedEntries = entries
      .filter((entry) =>
        isParticipantRankEligible({
          maxRank: queue.maxRank,
          minRank: queue.minRank,
          rank: entry.rank,
        })
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
      createdAt: now,
      inviteCodeType: inviteMode === "bot_dm" ? inviteCodeType : undefined,
      lobbyCode: inviteCode || undefined,
      mode: inviteMode,
      queueId: args.queueId,
      selectedCount: selectedUsers.length,
      selectedUsers,
    })

    await ctx.db.patch(queue._id, {
      lastSelectedRoundId: roundId,
      updatedAt: now,
    })

    return {
      mode: inviteMode,
      queueId: queue._id,
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

    const inviteMode = normalizeStoredInviteMode(queue.inviteMode)
    const inviteCode = args.inviteCode?.trim()
    const inviteCodeType = args.inviteCodeType ?? DEFAULT_INVITE_CODE_TYPE

    if (inviteMode === "bot_dm" && !inviteCode) {
      throw new Error("Invite code is required for bot_dm mode")
    }

    if (inviteMode === "bot_dm" && !args.inviteCodeType) {
      throw new Error("Invite code type is required for bot_dm mode")
    }

    const selectedUsers = [mapEntryToSelectedUser(entry)]

    await ctx.db.delete(entry._id)

    const now = Date.now()
    const roundId = await ctx.db.insert("viewerQueueRounds", {
      createdAt: now,
      inviteCodeType: inviteMode === "bot_dm" ? inviteCodeType : undefined,
      lobbyCode: inviteCode || undefined,
      mode: inviteMode,
      queueId: queue._id,
      selectedCount: selectedUsers.length,
      selectedUsers,
    })

    await ctx.db.patch(queue._id, {
      lastSelectedRoundId: roundId,
      updatedAt: now,
    })

    return {
      mode: inviteMode,
      queueId: queue._id,
      roundId,
      selectedCount: selectedUsers.length,
      selectedUsers,
    }
  },
})

export const setQueueActive = internalMutation({
  args: {
    isActive: v.boolean(),
    queueId: v.id("viewerQueues"),
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
      isActive: args.isActive,
      queueId: args.queueId,
    }
  },
})

export const leaveQueue = internalMutation({
  args: {
    discordUserId: v.string(),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    return await leaveQueueFromPlatformCore(ctx, {
      platform: "discord",
      platformUserId: args.discordUserId,
      queueId: args.queueId,
    })
  },
})

export const leaveQueueFromPlatform = internalMutation({
  args: {
    platform: queuePlatformValidator,
    platformUserId: v.string(),
    queueId: v.id("viewerQueues"),
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
      entryId: args.entryId,
      queueId: entry.queueId,
      removed: true,
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
      .withIndex("by_queueId", (query) => query.eq("queueId", args.queueId))
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
    creatorDisplayName: v.string(),
    creatorMessage: v.optional(v.string()),
    gameLabel: v.string(),
    inviteMode: inviteModeValidator,
    matchesPerViewer: v.number(),
    maxRank: queueConfigRankValidator,
    minRank: queueConfigRankValidator,
    playersPerBatch: v.number(),
    queueId: v.id("viewerQueues"),
    rulesText: v.optional(v.string()),
    title: v.string(),
    twitchBotAnnouncementsEnabled: v.optional(v.boolean()),
    twitchBroadcasterId: v.optional(v.string()),
    twitchBroadcasterLogin: v.optional(v.string()),
    twitchCommandsEnabled: v.optional(v.boolean()),
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

    const twitchContext = resolveStoredTwitchContext({
      currentQueue: queue,
      twitchBotAnnouncementsEnabled: args.twitchBotAnnouncementsEnabled,
      twitchBroadcasterId: args.twitchBroadcasterId,
      twitchBroadcasterLogin: args.twitchBroadcasterLogin,
      twitchCommandsEnabled: args.twitchCommandsEnabled,
    })

    await ctx.db.patch(args.queueId, {
      creatorDisplayName: requireNonEmptyString(
        args.creatorDisplayName,
        "creatorDisplayName"
      ),
      creatorMessage: args.creatorMessage?.trim() || undefined,
      gameLabel: requireNonEmptyString(args.gameLabel, "gameLabel"),
      inviteMode: args.inviteMode,
      matchesPerViewer: args.matchesPerViewer,
      maxRank: args.maxRank,
      minRank: args.minRank,
      playersPerBatch: args.playersPerBatch,
      rulesText: args.rulesText?.trim() || undefined,
      title: requireNonEmptyString(args.title, "title"),
      twitchBotAnnouncementsEnabled:
        twitchContext.twitchBotAnnouncementsEnabled,
      twitchBroadcasterId: twitchContext.twitchBroadcasterId,
      twitchBroadcasterLogin: twitchContext.twitchBroadcasterLogin,
      twitchCommandsEnabled: twitchContext.twitchCommandsEnabled,
      updatedAt: Date.now(),
    })

    return {
      queueId: args.queueId,
    }
  },
})

export const setQueueMessageMeta = internalMutation({
  args: {
    messageId: v.string(),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    await ctx.db.patch(args.queueId, {
      lastMessageSyncError: undefined,
      messageId: args.messageId.trim(),
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
    error: v.string(),
    queueId: v.id("viewerQueues"),
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
    channelId: v.optional(v.string()),
    channelName: v.optional(v.string()),
    channelPermsCorrect: v.optional(v.boolean()),
    guildName: v.optional(v.string()),
    queueId: v.id("viewerQueues"),
    resetMessageState: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const channelId = args.channelId?.trim()

    await ctx.db.patch(args.queueId, {
      ...(args.resetMessageState
        ? {
            lastMessageSyncError: undefined,
            messageId: undefined,
          }
        : {}),
      channelId: channelId || queue.channelId,
      channelName: args.channelName?.trim() || undefined,
      channelPermsCorrect: args.channelPermsCorrect,
      guildName: args.guildName?.trim() || undefined,
      updatedAt: Date.now(),
    })

    return { queueId: args.queueId }
  },
})

export const setQueueTwitchContext = internalMutation({
  args: {
    queueId: v.id("viewerQueues"),
    twitchBotAnnouncementsEnabled: v.optional(v.boolean()),
    twitchBroadcasterId: v.string(),
    twitchBroadcasterLogin: v.string(),
    twitchCommandsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId)

    if (!queue) {
      throw new Error("Queue not found")
    }

    const twitchContext = resolveStoredTwitchContext({
      currentQueue: queue,
      twitchBotAnnouncementsEnabled: args.twitchBotAnnouncementsEnabled,
      twitchBroadcasterId: args.twitchBroadcasterId,
      twitchBroadcasterLogin: args.twitchBroadcasterLogin,
      twitchCommandsEnabled: args.twitchCommandsEnabled,
    })

    await ctx.db.patch(args.queueId, {
      twitchBotAnnouncementsEnabled:
        twitchContext.twitchBotAnnouncementsEnabled,
      twitchBroadcasterId: twitchContext.twitchBroadcasterId,
      twitchBroadcasterLogin: twitchContext.twitchBroadcasterLogin,
      twitchCommandsEnabled: twitchContext.twitchCommandsEnabled,
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
