import { v } from "convex/values"

import type { Doc } from "../../_generated/dataModel"
import { query } from "../../_generated/server"
import {
  collectOwnedSessions,
  getCurrentRankedConfig,
  getOwnedSessionById,
  getOwnedSessionGames,
  isRankedSessionWritesEnabled,
  getSessionDisplayTitle,
  getSessionMatchCount,
  getSessionUsernameLabel,
  requireAuthenticatedStatsActor,
  sessionMatchesRankedConfig,
} from "../../lib/statsDashboard"

function getNumericValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function toDateKey(epochMs: number) {
  return new Date(epochMs).toISOString().slice(0, 10)
}

function getFilteredGames(
  games: Doc<"games">[],
  includeLossProtected: boolean
) {
  return includeLossProtected
    ? games
    : games.filter((game) => game.lossProtected !== true)
}

function buildDashboardSessionSummary(session: Doc<"sessions">) {
  return {
    archivedReason: session.archivedReason ?? null,
    currentSr: session.currentSr,
    endedAt: session.endedAt,
    id: session._id,
    isArchived: session.endedAt !== null,
    isLegacy: !session.ownerUserId || !session.activisionUsernameId,
    matchCount: getSessionMatchCount(session),
    netSr: session.currentSr - session.startSr,
    season: session.season,
    startSr: session.startSr,
    startedAt: session.startedAt,
    titleKey: session.titleKey ?? null,
    titleLabel: getSessionDisplayTitle(session),
    titleSeasonKey: session.titleSeasonKey ?? null,
    usernameLabel: session.activisionUsernameSnapshot ?? null,
    uuid: session.uuid,
    wins: session.wins,
    losses: session.losses,
  }
}

function buildAvailableModeSummary(mode: Doc<"rankedModes">) {
  return {
    id: mode._id,
    key: mode.key,
    label: mode.label,
    sortOrder: mode.sortOrder,
  }
}

function buildAvailableMapSummary(args: {
  map: Doc<"rankedMaps">
  supportedModes: Doc<"rankedModes">[]
}) {
  return {
    id: args.map._id,
    name: args.map.name,
    supportedModeIds: args.supportedModes.map((mode) => mode._id),
    supportedModes: args.supportedModes.map(buildAvailableModeSummary),
  }
}

function buildRecentMatchSummary(game: Doc<"games">) {
  const kills = getNumericValue(game.kills)
  const deaths = getNumericValue(game.deaths)

  return {
    createdAt: game.createdAt,
    deaths: game.deaths ?? null,
    defuses: game.defuses ?? null,
    enemyScore: game.enemyScore ?? null,
    hillTimeSeconds: game.hillTimeSeconds ?? null,
    id: game._id,
    kd:
      deaths > 0
        ? Math.round((kills / deaths) * 100) / 100
        : kills > 0
          ? kills
          : null,
    kills: game.kills ?? null,
    lossProtected: game.lossProtected,
    mapName: game.mapNameSnapshot ?? null,
    mode: game.mode ?? null,
    notes: game.notes ?? null,
    outcome: game.outcome,
    overloads: game.overloads ?? null,
    plants: game.plants ?? null,
    sessionUuid: game.sessionId,
    srChange: game.srChange,
    teamScore: game.teamScore ?? null,
  }
}

function buildOverview(args: {
  games: Doc<"games">[]
  includeLossProtected: boolean
  session: Doc<"sessions">
}) {
  const matchCount = getSessionMatchCount(args.session)
  const wins = args.session.wins
  const losses = args.session.losses
  const currentSr = args.session.currentSr
  const netSr = currentSr - args.session.startSr

  return {
    actualCurrentSr: currentSr,
    actualMatchCount: matchCount,
    currentSr,
    endedAt: args.session.endedAt,
    hasFilteredLossProtectedGames: false,
    id: args.session._id,
    isArchived: args.session.endedAt !== null,
    kills: args.session.kills,
    losses,
    matchCount,
    netSr,
    season: args.session.season,
    startSr: args.session.startSr,
    startedAt: args.session.startedAt,
    titleLabel: getSessionDisplayTitle(args.session),
    usernameLabel: getSessionUsernameLabel(args.session),
    uuid: args.session.uuid,
    winRate: matchCount > 0 ? wins / matchCount : 0,
    wins,
    deaths: args.session.deaths,
  }
}

async function getActiveRankedModesForTitle(
  ctx: Parameters<typeof getCurrentRankedConfig>[0],
  titleKey: string
) {
  return await ctx.db
    .query("rankedModes")
    .withIndex("by_title_active_sort", (query) =>
      query.eq("titleKey", titleKey).eq("isActive", true)
    )
    .collect()
}

async function getActiveRankedMapsForTitle(
  ctx: Parameters<typeof getCurrentRankedConfig>[0],
  titleKey: string
) {
  return await ctx.db
    .query("rankedMaps")
    .withIndex("by_title_active_sort", (query) =>
      query.eq("titleKey", titleKey).eq("isActive", true)
    )
    .collect()
}

export const getCurrentDashboardState = query({
  args: {},
  handler: async (ctx) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const [{ config, title }, sessions] = await Promise.all([
      getCurrentRankedConfig(ctx),
      collectOwnedSessions(ctx, actor),
    ])

    const [activeTitleModes, activeTitleMaps] = config
      ? await Promise.all([
          getActiveRankedModesForTitle(ctx, config.activeTitleKey),
          getActiveRankedMapsForTitle(ctx, config.activeTitleKey),
        ])
      : [[], []]
    const activeModeIds = new Set(activeTitleModes.map((mode) => mode._id))
    const activeLoggableMaps = activeTitleMaps.filter((map) =>
      (map.supportedModeIds ?? []).some((modeId) => activeModeIds.has(modeId))
    )

    const activeSessions =
      config && title
        ? sessions
            .filter(
              (session) =>
                session.endedAt === null &&
                sessionMatchesRankedConfig({
                  activeSeason: config.activeSeason,
                  activeTitleKey: config.activeTitleKey,
                  activeTitleLabel: title.label,
                  session,
                })
            )
            .map(buildDashboardSessionSummary)
        : []

    const archivedSessions = sessions
      .filter((session) => session.endedAt !== null)
      .slice(0, 24)
      .map(buildDashboardSessionSummary)

    return {
      activeSessions,
      archivedSessions,
      currentConfig:
        config && title
          ? {
              activeSeason: config.activeSeason,
              activeTitleKey: config.activeTitleKey,
              activeTitleLabel: title.label,
              sessionWritesEnabled: isRankedSessionWritesEnabled(config),
            }
          : null,
      hasCurrentTitleMaps: activeLoggableMaps.length > 0,
      hasCurrentTitleModes: activeTitleModes.length > 0,
      hasTrackedHistory: sessions.length > 0,
      planKey: actor.planKey,
      preferredMatchLoggingMode:
        actor.user.preferredMatchLoggingMode ?? "comprehensive",
      setupState: {
        needsConfig: config === null,
        needsMaps:
          config !== null &&
          title !== null &&
          activeTitleModes.length > 0 &&
          activeLoggableMaps.length === 0,
        needsModes:
          config !== null && title !== null && activeTitleModes.length === 0,
        needsTitle: config !== null && title === null,
      },
    }
  },
})

export const getAvailableActivisionUsernames = query({
  args: {},
  handler: async (ctx) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const usernames = await ctx.db
      .query("activisionUsernames")
      .withIndex("by_owner", (query) => query.eq("ownerUserId", actor.user._id))
      .collect()

    return usernames
      .sort(
        (left, right) =>
          right.lastUsedAt - left.lastUsedAt ||
          left.displayUsername.localeCompare(right.displayUsername)
      )
      .map((username) => ({
        displayUsername: username.displayUsername,
        id: username._id,
        isPrimary: username.isPrimary ?? false,
        lastUsedAt: username.lastUsedAt,
      }))
  },
})

export const getAvailableModesForCurrentTitle = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedStatsActor(ctx)
    const { config } = await getCurrentRankedConfig(ctx)

    if (!config) {
      return []
    }

    const modes = await getActiveRankedModesForTitle(ctx, config.activeTitleKey)
    return modes.map(buildAvailableModeSummary)
  },
})

export const getAvailableMapsForCurrentTitle = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedStatsActor(ctx)
    const { config } = await getCurrentRankedConfig(ctx)

    if (!config) {
      return []
    }

    const [modes, maps] = await Promise.all([
      getActiveRankedModesForTitle(ctx, config.activeTitleKey),
      getActiveRankedMapsForTitle(ctx, config.activeTitleKey),
    ])
    const modesById = new Map(modes.map((mode) => [mode._id, mode]))

    return maps.flatMap((map) => {
      const supportedModes = (map.supportedModeIds ?? [])
        .map((modeId) => modesById.get(modeId) ?? null)
        .filter((mode): mode is Doc<"rankedModes"> => mode !== null)

      if (supportedModes.length === 0) {
        return []
      }

      return [buildAvailableMapSummary({ map, supportedModes })]
    })
  },
})

export const getSessionOverview = query({
  args: {
    includeLossProtected: v.boolean(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    const games = await getOwnedSessionGames(ctx, session)
    return buildOverview({
      games,
      includeLossProtected: args.includeLossProtected,
      session,
    })
  },
})

export const getSessionSrTimeline = query({
  args: {
    includeLossProtected: v.boolean(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    const games = getFilteredGames(
      await getOwnedSessionGames(ctx, session),
      args.includeLossProtected
    )
    let currentSr = session.startSr

    const points = [
      {
        createdAt: session.startedAt,
        matchNumber: 0,
        sr: session.startSr,
        srChange: 0,
      },
    ]

    for (const [index, game] of games.entries()) {
      currentSr += game.srChange
      points.push({
        createdAt: game.createdAt,
        matchNumber: index + 1,
        sr: currentSr,
        srChange: game.srChange,
      })
    }

    return {
      points,
      sessionId: session._id,
      startSr: session.startSr,
    }
  },
})

export const getSessionWinLossBreakdown = query({
  args: {
    includeLossProtected: v.boolean(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    const games = getFilteredGames(
      await getOwnedSessionGames(ctx, session),
      args.includeLossProtected
    )
    const wins = games.filter((game) => game.outcome === "win").length
    const losses = games.length - wins

    return {
      items: [
        { key: "wins", label: "Wins", value: wins },
        { key: "losses", label: "Losses", value: losses },
      ],
      total: games.length,
      wins,
      losses,
    }
  },
})

export const getSessionDailyPerformance = query({
  args: {
    includeLossProtected: v.boolean(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    const dailyBuckets = new Map<
      string,
      { dateKey: string; losses: number; netSr: number; wins: number }
    >()
    const games = getFilteredGames(
      await getOwnedSessionGames(ctx, session),
      args.includeLossProtected
    )

    for (const game of games) {
      const dateKey = toDateKey(game.createdAt)
      const existingBucket = dailyBuckets.get(dateKey) ?? {
        dateKey,
        losses: 0,
        netSr: 0,
        wins: 0,
      }

      existingBucket.netSr += game.srChange
      if (game.outcome === "win") {
        existingBucket.wins += 1
      } else {
        existingBucket.losses += 1
      }

      dailyBuckets.set(dateKey, existingBucket)
    }

    return {
      days: Array.from(dailyBuckets.values()).sort((left, right) =>
        left.dateKey.localeCompare(right.dateKey)
      ),
      sessionId: session._id,
    }
  },
})

export const getRecentSessionMatches = query({
  args: {
    includeLossProtected: v.boolean(),
    limit: v.optional(v.number()),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    const games = getFilteredGames(
      await getOwnedSessionGames(ctx, session),
      args.includeLossProtected
    ).sort((left, right) => right.createdAt - left.createdAt)

    return games.map(buildRecentMatchSummary)
  },
})
