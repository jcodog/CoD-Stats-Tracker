import { v } from "convex/values"
import type { Doc, Id } from "../../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../../_generated/server"
import {
  normalizeStoredQueueParticipant,
  queueNotificationMethodValidator,
  type QueuePlatform,
} from "../../../../src/lib/creator-tools/play-with-viewers/queue-domain"
import { normalizePlayWithViewersTwitchContext } from "../../../../src/lib/creator-tools/play-with-viewers/config"

type NotificationMutationCtx = MutationCtx
type QueueRoundSelectedUser = Doc<"viewerQueueRounds">["selectedUsers"][number]
type NotificationMethod = Exclude<
  Doc<"viewerQueueNotifications">["notificationMethod"],
  "manual_creator_contact"
>
type NotificationStatus = Doc<"viewerQueueNotifications">["notificationStatus"]
type NormalizedQueueRoundSelectedUser = QueueRoundSelectedUser & {
  platform: QueuePlatform
  platformUserId: string
}

export type InitializeRoundNotificationsResult = {
  createdNotificationCount: number
  roundId: Id<"viewerQueueRounds">
  selectedUsers: QueueRoundSelectedUser[]
}
export type RecordNotificationResult = {
  notificationId: Id<"viewerQueueNotifications">
  notificationStatus: NotificationStatus
}
export type DeferNotificationResult = RecordNotificationResult & {
  nextAttemptAt?: number
}
export type RecordDiscordDmFailureOperationalLogResult = {
  logId: Id<"viewerQueueOperationalLogs">
}

const DISCORD_DM_FAILED_EVENT_TYPE = "play_with_viewers.discord_dm_failed"
const MAX_OPERATIONAL_LOG_TEXT_LENGTH = 500

function sanitizeOperationalLogText(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ")

  if (!normalized) {
    return undefined
  }

  const redacted = normalized
    .replace(/\b(Bot|Bearer)\s+[A-Za-z0-9._~-]+/giu, "$1 [redacted]")
    .replace(
      /\b(authorization\s*[:=]\s*)[^\s,;}]+/giu,
      "$1[redacted]"
    )
    .replace(
      /\b((?:invite|lobby|party|private match)\s*(?:code)?\s*[:=]\s*)[^\s,;}]+/giu,
      "$1[redacted]"
    )

  return redacted.length > MAX_OPERATIONAL_LOG_TEXT_LENGTH
    ? `${redacted.slice(0, MAX_OPERATIONAL_LOG_TEXT_LENGTH)}...`
    : redacted
}

function normalizeRoundSelectedUser(
  user: QueueRoundSelectedUser
): NormalizedQueueRoundSelectedUser {
  return normalizeStoredQueueParticipant(
    user
  ) as NormalizedQueueRoundSelectedUser
}

function getDefaultNotificationMethodForPlatform(
  platform: QueuePlatform
): NotificationMethod {
  return platform === "discord" ? "discord_dm" : "twitch_whisper"
}

function applyNotificationStateToSelectedUser(
  user: QueueRoundSelectedUser,
  args: {
    notificationFailureReason?: string
    notificationMethod?: QueueRoundSelectedUser["notificationMethod"]
    notificationStatus?: QueueRoundSelectedUser["notificationStatus"]
  }
): QueueRoundSelectedUser {
  const nextNotificationFailureReason =
    args.notificationFailureReason?.trim() || undefined
  const nextNotificationMethod = args.notificationMethod
  const nextNotificationStatus = args.notificationStatus

  return {
    ...user,
    dmFailureReason:
      nextNotificationMethod === "discord_dm" &&
      nextNotificationStatus === "failed"
        ? nextNotificationFailureReason
        : nextNotificationMethod === "discord_dm" &&
            nextNotificationStatus === "sent"
          ? undefined
          : user.dmFailureReason,
    dmStatus:
      nextNotificationMethod === "discord_dm" &&
      nextNotificationStatus !== "pending"
        ? nextNotificationStatus
        : nextNotificationMethod === "discord_dm"
          ? undefined
          : user.dmStatus,
    notificationFailureReason: nextNotificationFailureReason,
    notificationMethod: nextNotificationMethod,
    notificationStatus: nextNotificationStatus,
  }
}

async function patchRoundSelectedUsers(
  ctx: NotificationMutationCtx,
  args: {
    roundId: Id<"viewerQueueRounds">
    selectedUsers: QueueRoundSelectedUser[]
  }
) {
  await ctx.db.patch(args.roundId, {
    selectedCount: args.selectedUsers.length,
    selectedUsers: args.selectedUsers,
  })
}

async function getNotificationForRoundUser(
  ctx: NotificationMutationCtx,
  args: {
    platform: QueuePlatform
    platformUserId: string
    roundId: Id<"viewerQueueRounds">
  }
) {
  return await ctx.db
    .query("viewerQueueNotifications")
    .withIndex("by_roundId_and_platformUserId", (query) =>
      query
        .eq("roundId", args.roundId)
        .eq("platform", args.platform)
        .eq("platformUserId", args.platformUserId)
    )
    .unique()
}

async function syncRoundSnapshotFromNotification(
  ctx: NotificationMutationCtx,
  args: {
    notificationFailureReason?: string
    notificationMethod: QueueRoundSelectedUser["notificationMethod"]
    notificationStatus: QueueRoundSelectedUser["notificationStatus"]
    platform: QueuePlatform
    platformUserId: string
    roundId: Id<"viewerQueueRounds">
  }
) {
  const round = await ctx.db.get(args.roundId)

  if (!round) {
    throw new Error("Queue round not found")
  }

  const selectedUsers = round.selectedUsers.map((user) => {
    if (
      user.platform !== args.platform ||
      user.platformUserId !== args.platformUserId
    ) {
      return user
    }

    return applyNotificationStateToSelectedUser(user, args)
  })

  await patchRoundSelectedUsers(ctx, {
    roundId: args.roundId,
    selectedUsers,
  })
}

export const initializeRoundNotifications = internalMutation({
  args: {
    roundId: v.id("viewerQueueRounds"),
  },
  handler: async (ctx, args): Promise<InitializeRoundNotificationsResult> => {
    const round = await ctx.db.get(args.roundId)

    if (!round) {
      throw new Error("Queue round not found")
    }

    if (round.mode === "manual_creator_contact") {
      const selectedUsers = round.selectedUsers.map((user) =>
        applyNotificationStateToSelectedUser(user, {
          notificationFailureReason: undefined,
          notificationMethod: "manual_creator_contact",
          notificationStatus: undefined,
        })
      )

      await patchRoundSelectedUsers(ctx, {
        roundId: args.roundId,
        selectedUsers,
      })

      return {
        createdNotificationCount: 0,
        roundId: args.roundId,
        selectedUsers,
      }
    }

    const queue = await ctx.db.get(round.queueId)
    const twitchContext = queue
      ? normalizePlayWithViewersTwitchContext(queue)
      : { twitchBotAnnouncementsEnabled: true }

    const now = Date.now()
    const selectedUsers: QueueRoundSelectedUser[] = []
    let createdNotificationCount = 0

    for (const storedUser of round.selectedUsers) {
      const user = normalizeRoundSelectedUser(storedUser)

      if (
        user.platform === "twitch" &&
        !twitchContext.twitchBotAnnouncementsEnabled
      ) {
        selectedUsers.push(
          applyNotificationStateToSelectedUser(user, {
            notificationFailureReason: undefined,
            notificationMethod: "manual_creator_contact",
            notificationStatus: undefined,
          })
        )
        continue
      }

      const notificationMethod = getDefaultNotificationMethodForPlatform(
        user.platform
      )
      const existingNotification = await getNotificationForRoundUser(ctx, {
        platform: user.platform,
        platformUserId: user.platformUserId,
        roundId: args.roundId,
      })

      if (!existingNotification) {
        await ctx.db.insert("viewerQueueNotifications", {
          attemptCount: 0,
          avatarUrl: user.avatarUrl,
          createdAt: now,
          displayName: user.displayName,
          lastAttemptAt: undefined,
          deliveredAt: undefined,
          linkedUserId: user.linkedUserId,
          nextAttemptAt: now,
          notificationFailureReason: undefined,
          notificationMethod,
          notificationStatus: "pending",
          platform: user.platform,
          platformUserId: user.platformUserId,
          queueId: round.queueId,
          rank: user.rank,
          roundId: round._id,
          updatedAt: now,
          username: user.username,
        })
        createdNotificationCount += 1
        selectedUsers.push(
          applyNotificationStateToSelectedUser(user, {
            notificationFailureReason: undefined,
            notificationMethod,
            notificationStatus: "pending",
          })
        )
        continue
      }

      selectedUsers.push(
        applyNotificationStateToSelectedUser(user, {
          notificationFailureReason:
            existingNotification.notificationFailureReason,
          notificationMethod: existingNotification.notificationMethod,
          notificationStatus: existingNotification.notificationStatus,
        })
      )
    }

    await patchRoundSelectedUsers(ctx, {
      roundId: args.roundId,
      selectedUsers,
    })

    return {
      createdNotificationCount,
      roundId: args.roundId,
      selectedUsers,
    }
  },
})

export const recordNotificationResult = internalMutation({
  args: {
    notificationFailureReason: v.optional(v.string()),
    notificationId: v.id("viewerQueueNotifications"),
    notificationMethod: queueNotificationMethodValidator,
    notificationStatus: v.union(v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args): Promise<RecordNotificationResult> => {
    const notification = await ctx.db.get(args.notificationId)

    if (!notification) {
      throw new Error("Queue notification not found")
    }

    if (notification.notificationStatus !== "pending") {
      return {
        notificationId: notification._id,
        notificationStatus: notification.notificationStatus,
      }
    }

    const now = Date.now()
    const nextFailureReason =
      args.notificationFailureReason?.trim() || undefined

    await ctx.db.patch(args.notificationId, {
      attemptCount: notification.attemptCount + 1,
      deliveredAt: args.notificationStatus === "sent" ? now : undefined,
      lastAttemptAt: now,
      notificationFailureReason: nextFailureReason,
      notificationMethod: args.notificationMethod,
      notificationStatus: args.notificationStatus,
      updatedAt: now,
    })

    await syncRoundSnapshotFromNotification(ctx, {
      notificationFailureReason: nextFailureReason,
      notificationMethod: args.notificationMethod,
      notificationStatus: args.notificationStatus,
      platform: notification.platform,
      platformUserId: notification.platformUserId,
      roundId: notification.roundId,
    })

    return {
      notificationId: args.notificationId,
      notificationStatus: args.notificationStatus,
    }
  },
})

export const recordDiscordDmFailureOperationalLog = internalMutation({
  args: {
    discordApiCode: v.optional(v.number()),
    discordApiMessage: v.optional(v.string()),
    discordHttpStatus: v.optional(v.number()),
    displayName: v.optional(v.string()),
    internalErrorMessage: v.optional(v.string()),
    notificationId: v.id("viewerQueueNotifications"),
    platformUserId: v.string(),
    queueId: v.id("viewerQueues"),
    roundId: v.id("viewerQueueRounds"),
    username: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<RecordDiscordDmFailureOperationalLogResult> => {
    const logId = await ctx.db.insert("viewerQueueOperationalLogs", {
      discordApiCode: args.discordApiCode,
      discordApiMessage: sanitizeOperationalLogText(args.discordApiMessage),
      discordHttpStatus: args.discordHttpStatus,
      displayName: sanitizeOperationalLogText(args.displayName),
      eventType: DISCORD_DM_FAILED_EVENT_TYPE,
      internalErrorMessage: sanitizeOperationalLogText(
        args.internalErrorMessage
      ),
      notificationId: args.notificationId,
      platformUserId: args.platformUserId,
      queueId: args.queueId,
      roundId: args.roundId,
      severity: "info",
      timestamp: Date.now(),
      username: sanitizeOperationalLogText(args.username),
    })

    return { logId }
  },
})

export const deferNotification = internalMutation({
  args: {
    nextAttemptAt: v.number(),
    notificationFailureReason: v.optional(v.string()),
    notificationId: v.id("viewerQueueNotifications"),
  },
  handler: async (ctx, args): Promise<DeferNotificationResult> => {
    const notification = await ctx.db.get(args.notificationId)

    if (!notification) {
      throw new Error("Queue notification not found")
    }

    if (notification.notificationStatus !== "pending") {
      return {
        nextAttemptAt: notification.nextAttemptAt,
        notificationId: notification._id,
        notificationStatus: notification.notificationStatus,
      }
    }

    const now = Date.now()
    const nextAttemptAt = Math.max(args.nextAttemptAt, now)
    const nextFailureReason =
      args.notificationFailureReason?.trim() || undefined

    await ctx.db.patch(args.notificationId, {
      attemptCount: notification.attemptCount + 1,
      lastAttemptAt: now,
      nextAttemptAt,
      notificationFailureReason: nextFailureReason,
      notificationStatus: "pending",
      updatedAt: now,
    })

    await syncRoundSnapshotFromNotification(ctx, {
      notificationFailureReason: nextFailureReason,
      notificationMethod: notification.notificationMethod,
      notificationStatus: "pending",
      platform: notification.platform,
      platformUserId: notification.platformUserId,
      roundId: notification.roundId,
    })

    return {
      nextAttemptAt,
      notificationId: args.notificationId,
      notificationStatus: "pending" as NotificationStatus,
    }
  },
})
