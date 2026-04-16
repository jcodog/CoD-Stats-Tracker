import { describe, expect, it } from "bun:test"

import {
  enqueueViewerFromPlatform,
  leaveQueueFromPlatform,
  selectNextBatch,
} from "../creatorTools/playingWithViewers/queue.ts"
import { getQueueStatusForIdentity } from "../../queries/creatorTools/playingWithViewers/queue.ts"
import {
  createMutationCtx,
  createQueryCtx,
  createQueue,
  withMockedNow,
} from "../../../test-utils/playingWithViewersTestUtils.mjs"

describe("playing with viewers shared queue identity handling", () => {
  it("returns already_joined for a duplicate same-platform join", async () => {
    const queueId = "viewerQueues:1"
    const ctx = createMutationCtx({
      viewerQueues: [createQueue({ _id: queueId })],
    })

    const firstResult = await withMockedNow(1_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Viewer",
        platform: "discord",
        platformUserId: "discord-1",
        queueId,
        rank: "gold",
        username: "viewer",
      })
    )
    const secondResult = await withMockedNow(2_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Viewer",
        platform: "discord",
        platformUserId: "discord-1",
        queueId,
        rank: "gold",
        username: "viewer",
      })
    )

    expect(firstResult.status).toBe("enqueued")
    expect(secondResult.status).toBe("already_joined")
    expect(secondResult.entryId).toBe(firstResult.entryId)
    expect(ctx.db.tables.viewerQueueEntries).toHaveLength(1)
  })

  it("dedupes linked Discord and Twitch identities onto the same queue entry", async () => {
    const queueId = "viewerQueues:1"
    const ctx = createMutationCtx({
      connectedAccounts: [
        {
          _id: "connectedAccounts:1",
          provider: "discord",
          providerUserId: "discord-1",
          userId: "users:42",
        },
        {
          _id: "connectedAccounts:2",
          provider: "twitch",
          providerUserId: "twitch-1",
          userId: "users:42",
        },
      ],
      viewerQueues: [createQueue({ _id: queueId })],
    })

    const discordJoin = await withMockedNow(1_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Viewer",
        platform: "discord",
        platformUserId: "discord-1",
        queueId,
        rank: "gold",
        username: "viewer",
      })
    )
    const twitchJoin = await withMockedNow(2_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "ViewerTV",
        platform: "twitch",
        platformUserId: "twitch-1",
        queueId,
        rank: "unknown",
        username: "viewer_tv",
      })
    )

    expect(discordJoin.status).toBe("enqueued")
    expect(twitchJoin.status).toBe("already_joined")
    expect(twitchJoin.entryId).toBe(discordJoin.entryId)
    expect(ctx.db.tables.viewerQueueEntries).toHaveLength(1)
  })

  it("keeps unlinked Discord and Twitch joins as separate queue identities", async () => {
    const queueId = "viewerQueues:1"
    const ctx = createMutationCtx({
      viewerQueues: [createQueue({ _id: queueId })],
    })

    await withMockedNow(1_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Discord Viewer",
        platform: "discord",
        platformUserId: "discord-1",
        queueId,
        rank: "gold",
        username: "viewer",
      })
    )
    await withMockedNow(2_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Twitch Viewer",
        platform: "twitch",
        platformUserId: "twitch-1",
        queueId,
        rank: "unknown",
        username: "viewer_tv",
      })
    )

    expect(ctx.db.tables.viewerQueueEntries).toHaveLength(2)
    expect(
      ctx.db.tables.viewerQueueEntries.map((entry) => entry.platform).sort()
    ).toEqual(["discord", "twitch"])
  })

  it("enforces cooldown only for new joins after the previous entry was removed", async () => {
    const queueId = "viewerQueues:1"
    const ctx = createMutationCtx({
      viewerQueues: [createQueue({ _id: queueId })],
    })

    const initialJoin = await withMockedNow(1_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Viewer",
        platform: "twitch",
        platformUserId: "twitch-1",
        queueId,
        rank: "unknown",
        username: "viewer_tv",
      })
    )

    await withMockedNow(2_000, () =>
      leaveQueueFromPlatform._handler(ctx, {
        platform: "twitch",
        platformUserId: "twitch-1",
        queueId,
      })
    )

    const rejoin = await withMockedNow(3_000, () =>
      enqueueViewerFromPlatform._handler(ctx, {
        displayName: "Viewer",
        platform: "twitch",
        platformUserId: "twitch-1",
        queueId,
        rank: "unknown",
        username: "viewer_tv",
      })
    )

    expect(initialJoin.status).toBe("enqueued")
    expect(rejoin.status).toBe("cooldown")
    expect(rejoin.cooldownRemainingMs).toBe(598_000)
    expect(ctx.db.tables.viewerQueueEntries).toHaveLength(0)
  })

  it("keeps unknown-rank viewers eligible during selection", async () => {
    const queueId = "viewerQueues:1"
    const ctx = createMutationCtx({
      viewerQueueEntries: [
        {
          _id: "viewerQueueEntries:1",
          displayName: "Mystery Viewer",
          joinedAt: 1_000,
          platform: "twitch",
          platformUserId: "twitch-1",
          queueId,
          rank: "unknown",
          username: "mystery_viewer",
        },
        {
          _id: "viewerQueueEntries:2",
          displayName: "Gold Viewer",
          joinedAt: 2_000,
          platform: "discord",
          platformUserId: "discord-1",
          queueId,
          rank: "gold",
          username: "gold_viewer",
        },
      ],
      viewerQueues: [
        createQueue({
          _id: queueId,
          inviteMode: "manual_creator_contact",
          maxRank: "crimson",
          minRank: "platinum",
          playersPerBatch: 2,
        }),
      ],
    })

    const result = await withMockedNow(5_000, () =>
      selectNextBatch._handler(ctx, {
        queueId,
      })
    )

    expect(result.selectedCount).toBe(1)
    expect(result.selectedUsers).toHaveLength(1)
    expect(result.selectedUsers[0].rank).toBe("unknown")
    expect(result.selectedUsers[0].platform).toBe("twitch")
  })

  it("resolves queue status and leave operations through linked identities", async () => {
    const queueId = "viewerQueues:1"
    const initialTables = {
      connectedAccounts: [
        {
          _id: "connectedAccounts:1",
          provider: "discord",
          providerUserId: "discord-1",
          userId: "users:42",
        },
        {
          _id: "connectedAccounts:2",
          provider: "twitch",
          providerUserId: "twitch-1",
          userId: "users:42",
        },
      ],
      viewerQueues: [createQueue({ _id: queueId })],
    }

    const mutationCtx = createMutationCtx(initialTables)

    await withMockedNow(1_000, () =>
      enqueueViewerFromPlatform._handler(mutationCtx, {
        displayName: "Viewer",
        platform: "discord",
        platformUserId: "discord-1",
        queueId,
        rank: "gold",
        username: "viewer",
      })
    )

    const statusCtx = createQueryCtx(mutationCtx.db.tables)
    const status = await getQueueStatusForIdentity._handler(statusCtx, {
      platform: "twitch",
      platformUserId: "twitch-1",
      queueId,
    })

    expect(status.joined).toBe(true)
    expect(status.queuePosition).toBe(1)
    expect(status.queueSize).toBe(1)

    const leaveResult = await leaveQueueFromPlatform._handler(mutationCtx, {
      platform: "twitch",
      platformUserId: "twitch-1",
      queueId,
    })

    expect(leaveResult.removed).toBe(true)
    expect(mutationCtx.db.tables.viewerQueueEntries).toHaveLength(0)
  })
})
