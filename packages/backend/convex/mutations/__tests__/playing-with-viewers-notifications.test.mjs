import { describe, expect, it } from "bun:test"

import {
  deferNotification,
  initializeRoundNotifications,
  recordNotificationResult,
} from "../creatorTools/playingWithViewers/notifications.ts"
import { getPendingTwitchNotifications } from "../../queries/creatorTools/playingWithViewers/twitch.ts"
import {
  createMutationCtx,
  createQueryCtx,
  createQueue,
  createQueueRound,
  createSelectedUser,
  withMockedNow,
} from "../../../test-utils/playingWithViewersTestUtils.mjs"

describe("playing with viewers notification persistence", () => {
  it("tracks manual creator contact without creating queued notifications", async () => {
    const roundId = "viewerQueueRounds:1"
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: roundId,
          mode: "manual_creator_contact",
          selectedUsers: [
            createSelectedUser({
              platform: "discord",
              platformUserId: "discord-1",
            }),
          ],
        }),
      ],
    })

    const result = await initializeRoundNotifications._handler(ctx, {
      roundId,
    })

    expect(result.createdNotificationCount).toBe(0)
    expect(ctx.db.tables.viewerQueueNotifications).toHaveLength(0)
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers[0]).toMatchObject({
      notificationMethod: "manual_creator_contact",
      notificationStatus: undefined,
    })
  })

  it("creates pending Discord and Twitch notification jobs for bot delivery", async () => {
    const roundId = "viewerQueueRounds:1"
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: roundId,
          selectedUsers: [
            createSelectedUser({
              platform: "discord",
              platformUserId: "discord-1",
            }),
            createSelectedUser({
              platform: "twitch",
              platformUserId: "twitch-1",
              rank: "unknown",
              username: "viewer_tv",
            }),
          ],
        }),
      ],
    })

    const result = await withMockedNow(5_000, () =>
      initializeRoundNotifications._handler(ctx, { roundId })
    )

    expect(result.createdNotificationCount).toBe(2)
    expect(ctx.db.tables.viewerQueueNotifications).toHaveLength(2)
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers).toEqual([
      expect.objectContaining({
        notificationMethod: "discord_dm",
        notificationStatus: "pending",
        platform: "discord",
      }),
      expect.objectContaining({
        notificationMethod: "twitch_whisper",
        notificationStatus: "pending",
        platform: "twitch",
      }),
    ])
  })

  it("records Twitch whisper delivery idempotently and mirrors the round snapshot", async () => {
    const roundId = "viewerQueueRounds:1"
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: roundId,
          selectedUsers: [
            createSelectedUser({
              platform: "twitch",
              platformUserId: "twitch-1",
              rank: "unknown",
              username: "viewer_tv",
            }),
          ],
        }),
      ],
    })

    await withMockedNow(1_000, () =>
      initializeRoundNotifications._handler(ctx, { roundId })
    )

    const notificationId = ctx.db.tables.viewerQueueNotifications[0]._id
    const firstResult = await withMockedNow(2_000, () =>
      recordNotificationResult._handler(ctx, {
        notificationId,
        notificationMethod: "twitch_whisper",
        notificationStatus: "sent",
      })
    )
    const secondResult = await withMockedNow(3_000, () =>
      recordNotificationResult._handler(ctx, {
        notificationFailureReason: "should be ignored",
        notificationId,
        notificationMethod: "twitch_chat_fallback",
        notificationStatus: "failed",
      })
    )

    expect(firstResult.notificationStatus).toBe("sent")
    expect(secondResult.notificationStatus).toBe("sent")
    expect(ctx.db.tables.viewerQueueNotifications[0]).toMatchObject({
      attemptCount: 1,
      notificationMethod: "twitch_whisper",
      notificationStatus: "sent",
    })
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers[0]).toMatchObject({
      notificationMethod: "twitch_whisper",
      notificationStatus: "sent",
      rank: "unknown",
    })
  })

  it("captures Twitch chat fallback delivery results in the round snapshot", async () => {
    const roundId = "viewerQueueRounds:1"
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: roundId,
          selectedUsers: [
            createSelectedUser({
              platform: "twitch",
              platformUserId: "twitch-1",
              username: "viewer_tv",
            }),
          ],
        }),
      ],
    })

    await withMockedNow(1_000, () =>
      initializeRoundNotifications._handler(ctx, { roundId })
    )

    const notificationId = ctx.db.tables.viewerQueueNotifications[0]._id
    await withMockedNow(2_000, () =>
      recordNotificationResult._handler(ctx, {
        notificationId,
        notificationMethod: "twitch_chat_fallback",
        notificationStatus: "sent",
      })
    )

    expect(ctx.db.tables.viewerQueueNotifications[0]).toMatchObject({
      notificationMethod: "twitch_chat_fallback",
      notificationStatus: "sent",
    })
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers[0]).toMatchObject({
      notificationMethod: "twitch_chat_fallback",
      notificationStatus: "sent",
    })
  })

  it("defers pending Twitch notifications and remains idempotent after final delivery", async () => {
    const roundId = "viewerQueueRounds:1"
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: roundId,
          selectedUsers: [
            createSelectedUser({
              platform: "twitch",
              platformUserId: "twitch-1",
              username: "viewer_tv",
            }),
          ],
        }),
      ],
    })

    await withMockedNow(1_000, () =>
      initializeRoundNotifications._handler(ctx, { roundId })
    )

    const notificationId = ctx.db.tables.viewerQueueNotifications[0]._id
    const deferredResult = await withMockedNow(2_000, () =>
      deferNotification._handler(ctx, {
        nextAttemptAt: 10_000,
        notificationFailureReason: "Rate limited",
        notificationId,
      })
    )

    expect(deferredResult.notificationStatus).toBe("pending")
    expect(ctx.db.tables.viewerQueueNotifications[0]).toMatchObject({
      attemptCount: 1,
      nextAttemptAt: 10_000,
      notificationFailureReason: "Rate limited",
      notificationStatus: "pending",
    })
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers[0]).toMatchObject({
      notificationMethod: "twitch_whisper",
      notificationStatus: "pending",
      notificationFailureReason: "Rate limited",
    })

    await withMockedNow(3_000, () =>
      recordNotificationResult._handler(ctx, {
        notificationId,
        notificationMethod: "twitch_whisper",
        notificationStatus: "sent",
      })
    )

    const redundantDeferral = await withMockedNow(4_000, () =>
      deferNotification._handler(ctx, {
        nextAttemptAt: 20_000,
        notificationFailureReason: "ignored",
        notificationId,
      })
    )

    expect(redundantDeferral.notificationStatus).toBe("sent")
    expect(ctx.db.tables.viewerQueueNotifications[0]).toMatchObject({
      attemptCount: 2,
      nextAttemptAt: 10_000,
      notificationMethod: "twitch_whisper",
      notificationStatus: "sent",
    })
  })

  it("returns only due Twitch notifications when draining pending jobs", async () => {
    const queueId = "viewerQueues:1"
    const roundId = "viewerQueueRounds:1"
    const queryCtx = createQueryCtx({
      viewerQueueNotifications: [
        {
          _id: "viewerQueueNotifications:1",
          attemptCount: 0,
          createdAt: 1_000,
          displayName: "Due Viewer",
          nextAttemptAt: 5_000,
          notificationMethod: "twitch_whisper",
          notificationStatus: "pending",
          platform: "twitch",
          platformUserId: "twitch-1",
          queueId,
          rank: "unknown",
          roundId,
          updatedAt: 1_000,
          username: "due_viewer",
        },
        {
          _id: "viewerQueueNotifications:2",
          attemptCount: 0,
          createdAt: 1_000,
          displayName: "Future Viewer",
          nextAttemptAt: 20_000,
          notificationMethod: "twitch_whisper",
          notificationStatus: "pending",
          platform: "twitch",
          platformUserId: "twitch-2",
          queueId,
          rank: "unknown",
          roundId,
          updatedAt: 1_000,
          username: "future_viewer",
        },
        {
          _id: "viewerQueueNotifications:3",
          attemptCount: 0,
          createdAt: 1_000,
          displayName: "Discord Viewer",
          nextAttemptAt: 4_000,
          notificationMethod: "discord_dm",
          notificationStatus: "pending",
          platform: "discord",
          platformUserId: "discord-1",
          queueId,
          rank: "gold",
          roundId,
          updatedAt: 1_000,
          username: "discord_viewer",
        },
      ],
      viewerQueueRounds: [
        createQueueRound({
          _id: roundId,
          inviteCodeType: "party_code",
          lobbyCode: "ABC123",
          queueId,
          selectedUsers: [
            createSelectedUser({
              platform: "twitch",
              platformUserId: "twitch-1",
              rank: "unknown",
              username: "due_viewer",
            }),
          ],
        }),
      ],
      viewerQueues: [
        createQueue({
          _id: queueId,
          creatorDisplayName: "Streamer",
          gameLabel: "Call of Duty",
          title: "Viewer Queue",
          twitchBroadcasterId: "broadcaster-1",
          twitchBroadcasterLogin: "streamer",
        }),
      ],
    })

    const jobs = await withMockedNow(10_000, () =>
      getPendingTwitchNotifications._handler(queryCtx, { limit: 10 })
    )

    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      notification: {
        _id: "viewerQueueNotifications:1",
        platformUserId: "twitch-1",
        username: "due_viewer",
      },
      queue: {
        creatorDisplayName: "Streamer",
        twitchBroadcasterLogin: "streamer",
      },
      round: {
        inviteCodeType: "party_code",
        lobbyCode: "ABC123",
      },
    })
  })
})
