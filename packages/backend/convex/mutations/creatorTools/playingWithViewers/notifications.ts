import { v } from "convex/values"
import type { Doc, Id } from "../../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../../_generated/server"
import { queueNotificationMethodValidator } from "../../../lib/playingWithViewers"

type NotificationMutationCtx = MutationCtx
type QueueRoundSelectedUser = Doc<"viewerQueueRounds">["selectedUsers"][number]
type NotificationMethod = Exclude<
  Doc<"viewerQueueNotifications">["notificationMethod"],
  "manual_creator_contact"
>
type NotificationStatus = Doc<"viewerQueueNotifications">["notificationStatus"]

function getDefaultNotificationMethodForPlatform(
  platform: QueueRoundSelectedUser["platform"]
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
    platform: QueueRoundSelectedUser["platform"]
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
    platform: QueueRoundSelectedUser["platform"]
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
  handler: async (ctx, args) => {
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

    const now = Date.now()
    const selectedUsers: QueueRoundSelectedUser[] = []
    let createdNotificationCount = 0

    for (const user of round.selectedUsers) {
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
  handler: async (ctx, args) => {
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
    const nextFailureReason = args.notificationFailureReason?.trim() || undefined

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

export const deferNotification = internalMutation({
  args: {
    nextAttemptAt: v.number(),
    notificationFailureReason: v.optional(v.string()),
    notificationId: v.id("viewerQueueNotifications"),
  },
  handler: async (ctx, args) => {
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
    const nextFailureReason = args.notificationFailureReason?.trim() || undefined

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
