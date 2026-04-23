import { describe, expect, it } from "bun:test"

import {
  disableViewerQueueTwitchIntegration,
  migrateLegacyViewerQueueSchema,
  migrateLegacyViewerQueueInviteModes,
} from "../migrations/playingWithViewers.ts"
import {
  createMutationCtx,
  createQueue,
  createQueueRound,
  withMockedNow,
} from "../../../test-utils/playingWithViewersTestUtils.mjs"

describe("playing with viewers invite mode migration", () => {
  it("rewrites legacy discord_dm queue and round values to bot_dm", async () => {
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: "viewerQueueRounds:legacy",
          mode: "discord_dm",
        }),
      ],
      viewerQueues: [
        createQueue({
          _id: "viewerQueues:legacy",
          inviteMode: "discord_dm",
          updatedAt: 10,
        }),
      ],
    })

    const result = await withMockedNow(5_000, () =>
      migrateLegacyViewerQueueInviteModes._handler(ctx, {})
    )

    expect(result.updatedQueueCount).toBe(1)
    expect(result.updatedRoundCount).toBe(1)
    expect(ctx.db.tables.viewerQueues[0].inviteMode).toBe("bot_dm")
    expect(ctx.db.tables.viewerQueues[0].updatedAt).toBe(5_000)
    expect(ctx.db.tables.viewerQueueRounds[0].mode).toBe("bot_dm")
  })

  it("supports dry-run without mutating stored values", async () => {
    const ctx = createMutationCtx({
      viewerQueueRounds: [
        createQueueRound({
          _id: "viewerQueueRounds:legacy",
          mode: "discord_dm",
        }),
      ],
      viewerQueues: [
        createQueue({
          _id: "viewerQueues:legacy",
          inviteMode: "discord_dm",
          updatedAt: 10,
        }),
      ],
    })

    const result = await withMockedNow(5_000, () =>
      migrateLegacyViewerQueueInviteModes._handler(ctx, {
        dryRun: true,
      })
    )

    expect(result.dryRun).toBe(true)
    expect(result.updatedQueueCount).toBe(1)
    expect(result.updatedRoundCount).toBe(1)
    expect(ctx.db.tables.viewerQueues[0].inviteMode).toBe("discord_dm")
    expect(ctx.db.tables.viewerQueues[0].updatedAt).toBe(10)
    expect(ctx.db.tables.viewerQueueRounds[0].mode).toBe("discord_dm")
  })
})

describe("playing with viewers schema migration", () => {
  it("backfills legacy discord-only queue data to the current schema", async () => {
    const legacyQueue = createQueue({
      _id: "viewerQueues:legacy-schema",
      inviteMode: "discord_dm",
      updatedAt: 10,
    })
    delete legacyQueue.twitchBotAnnouncementsEnabled
    delete legacyQueue.twitchBroadcasterId
    delete legacyQueue.twitchBroadcasterLogin
    delete legacyQueue.twitchCommandsEnabled

    const ctx = createMutationCtx({
      viewerQueueEntries: [
        {
          _id: "viewerQueueEntries:legacy",
          discordUserId: "discord-1",
          displayName: "Viewer",
          joinedAt: 20,
          linkedUserId: undefined,
          queueId: "viewerQueues:legacy-schema",
          rank: "gold",
          username: "viewer",
        },
      ],
      viewerQueueRounds: [
        createQueueRound({
          _id: "viewerQueueRounds:legacy-schema",
          mode: "discord_dm",
          queueId: "viewerQueues:legacy-schema",
          selectedUsers: [
            {
              discordUserId: "discord-1",
              displayName: "Viewer",
              rank: "gold",
              username: "viewer",
            },
          ],
        }),
      ],
      viewerQueues: [legacyQueue],
    })

    const result = await withMockedNow(7_000, () =>
      migrateLegacyViewerQueueSchema._handler(ctx, {})
    )

    expect(result.updatedQueueCount).toBe(1)
    expect(result.updatedEntryCount).toBe(1)
    expect(result.updatedRoundCount).toBe(1)
    expect(ctx.db.tables.viewerQueues[0].inviteMode).toBe("bot_dm")
    expect(ctx.db.tables.viewerQueues[0].twitchBotAnnouncementsEnabled).toBe(
      false
    )
    expect(ctx.db.tables.viewerQueues[0].twitchCommandsEnabled).toBe(false)
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterId).toBe("")
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterLogin).toBe("")
    expect(ctx.db.tables.viewerQueues[0].updatedAt).toBe(7_000)
    expect(ctx.db.tables.viewerQueueEntries[0].platform).toBe("discord")
    expect(ctx.db.tables.viewerQueueEntries[0].platformUserId).toBe("discord-1")
    expect(ctx.db.tables.viewerQueueRounds[0].mode).toBe("bot_dm")
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers[0].platform).toBe(
      "discord"
    )
    expect(
      ctx.db.tables.viewerQueueRounds[0].selectedUsers[0].platformUserId
    ).toBe("discord-1")
  })

  it("supports dry-run for the full legacy schema migration", async () => {
    const legacyQueue = createQueue({
      _id: "viewerQueues:legacy-schema",
      inviteMode: "discord_dm",
      updatedAt: 10,
    })
    delete legacyQueue.twitchBotAnnouncementsEnabled
    delete legacyQueue.twitchBroadcasterId
    delete legacyQueue.twitchBroadcasterLogin
    delete legacyQueue.twitchCommandsEnabled

    const ctx = createMutationCtx({
      viewerQueueEntries: [
        {
          _id: "viewerQueueEntries:legacy",
          discordUserId: "discord-1",
          displayName: "Viewer",
          joinedAt: 20,
          linkedUserId: undefined,
          queueId: "viewerQueues:legacy-schema",
          rank: "gold",
          username: "viewer",
        },
      ],
      viewerQueueRounds: [
        createQueueRound({
          _id: "viewerQueueRounds:legacy-schema",
          mode: "discord_dm",
          queueId: "viewerQueues:legacy-schema",
          selectedUsers: [
            {
              discordUserId: "discord-1",
              displayName: "Viewer",
              rank: "gold",
              username: "viewer",
            },
          ],
        }),
      ],
      viewerQueues: [legacyQueue],
    })

    const result = await withMockedNow(7_000, () =>
      migrateLegacyViewerQueueSchema._handler(ctx, {
        dryRun: true,
      })
    )

    expect(result.dryRun).toBe(true)
    expect(result.updatedQueueCount).toBe(1)
    expect(result.updatedEntryCount).toBe(1)
    expect(result.updatedRoundCount).toBe(1)
    expect(ctx.db.tables.viewerQueues[0].inviteMode).toBe("discord_dm")
    expect(ctx.db.tables.viewerQueues[0].twitchBotAnnouncementsEnabled).toBe(
      undefined
    )
    expect(ctx.db.tables.viewerQueues[0].twitchCommandsEnabled).toBe(undefined)
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterId).toBe(undefined)
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterLogin).toBe(undefined)
    expect(ctx.db.tables.viewerQueues[0].updatedAt).toBe(10)
    expect(ctx.db.tables.viewerQueueEntries[0].platform).toBe(undefined)
    expect(ctx.db.tables.viewerQueueEntries[0].platformUserId).toBe(undefined)
    expect(ctx.db.tables.viewerQueueRounds[0].mode).toBe("discord_dm")
    expect(ctx.db.tables.viewerQueueRounds[0].selectedUsers[0].platform).toBe(
      undefined
    )
    expect(
      ctx.db.tables.viewerQueueRounds[0].selectedUsers[0].platformUserId
    ).toBe(undefined)
  })
})

describe("playing with viewers twitch disable migration", () => {
  it("disables stored twitch queue settings for existing queues", async () => {
    const ctx = createMutationCtx({
      viewerQueues: [
        createQueue({
          _id: "viewerQueues:legacy-twitch",
          twitchBotAnnouncementsEnabled: true,
          twitchBroadcasterId: "broadcaster-1",
          twitchBroadcasterLogin: "streamer",
          twitchCommandsEnabled: true,
          updatedAt: 25,
        }),
      ],
    })

    const result = await withMockedNow(6_000, () =>
      disableViewerQueueTwitchIntegration._handler(ctx, {})
    )

    expect(result.updatedQueueCount).toBe(1)
    expect(ctx.db.tables.viewerQueues[0].twitchBotAnnouncementsEnabled).toBe(false)
    expect(ctx.db.tables.viewerQueues[0].twitchCommandsEnabled).toBe(false)
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterId).toBe("")
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterLogin).toBe("")
    expect(ctx.db.tables.viewerQueues[0].updatedAt).toBe(6_000)
  })

  it("supports dry-run for twitch disable migration", async () => {
    const ctx = createMutationCtx({
      viewerQueues: [
        createQueue({
          _id: "viewerQueues:legacy-twitch",
          twitchBotAnnouncementsEnabled: true,
          twitchBroadcasterId: "broadcaster-1",
          twitchBroadcasterLogin: "streamer",
          twitchCommandsEnabled: true,
          updatedAt: 25,
        }),
      ],
    })

    const result = await withMockedNow(6_000, () =>
      disableViewerQueueTwitchIntegration._handler(ctx, {
        dryRun: true,
      })
    )

    expect(result.dryRun).toBe(true)
    expect(result.updatedQueueCount).toBe(1)
    expect(ctx.db.tables.viewerQueues[0].twitchBotAnnouncementsEnabled).toBe(true)
    expect(ctx.db.tables.viewerQueues[0].twitchCommandsEnabled).toBe(true)
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterId).toBe(
      "broadcaster-1"
    )
    expect(ctx.db.tables.viewerQueues[0].twitchBroadcasterLogin).toBe("streamer")
    expect(ctx.db.tables.viewerQueues[0].updatedAt).toBe(25)
  })
})
