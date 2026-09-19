import { v } from "convex/values"
import { paginationOptsValidator } from "convex/server"

import type { Doc } from "../../_generated/dataModel"
import { query } from "../../_generated/server"
import {
  collectActiveOwnedSessions,
  getCurrentRankedConfig,
  getOwnedSessionById,
  isRankedSessionWritesEnabled,
  getSessionDisplayTitle,
  getSessionMatchCount,
  getSessionUsernameLabel,
  requireAuthenticatedStatsActor,
  requireAuthenticatedStatsIdentity,
  sessionMatchesRankedConfig,
} from "../../../src/lib/statsDashboard"

function getNumericValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
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

function buildOverview(args: { session: Doc<"sessions"> }) {
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
      collectActiveOwnedSessions(ctx, actor),
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


    return {
      activeSessions,
      availableModes: activeTitleModes.map(buildAvailableModeSummary),
      availableMaps: activeLoggableMaps.map((map) =>
        buildAvailableMapSummary({
          map,
          supportedModes: activeTitleModes.filter((mode) =>
            map.supportedModeIds?.includes(mode._id)
          ),
        })
      ),
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
    const actor = await requireAuthenticatedStatsIdentity(ctx)
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

export const getSessionOverview = query({
  args: {
    includeLossProtected: v.boolean(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsIdentity(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    return buildOverview({ session })
  },
})

export const getRecentSessionMatches = query({
  args: {
    includeLossProtected: v.boolean(),
    limit: v.optional(v.number()),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsIdentity(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })

    if (!session) {
      throw new Error("Session not found.")
    }

    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 50)))
    if (!Number.isFinite(limit)) throw new Error("Match limit must be finite.")
    const gamesQuery = args.includeLossProtected
      ? ctx.db
          .query("games")
          .withIndex("by_session_createdat", (q) =>
            q.eq("sessionId", session.uuid)
          )
      : ctx.db
          .query("games")
          .withIndex("by_session_lossProtected_createdAt", (q) =>
            q.eq("sessionId", session.uuid).eq("lossProtected", false)
          )
    const games = await gamesQuery.order("desc").take(limit)
    return games.map(buildRecentMatchSummary)
  },
})

export const getSessionHistoryPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsIdentity(ctx)
    const session = await getOwnedSessionById({
      actor,
      ctx,
      sessionId: args.sessionId,
    })
    if (!session) throw new Error("Session not found.")
    const result = await ctx.db
      .query("games")
      .withIndex("by_session_createdat", (q) => q.eq("sessionId", session.uuid))
      .order("asc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 200),
        maximumRowsRead: 200,
        maximumBytesRead: 512_000,
      })
    return {
      ...result,
      page: result.page.map(
        ({ createdAt, srChange, outcome, lossProtected }) => ({
          createdAt,
          srChange,
          outcome,
          lossProtected,
        })
      ),
    }
  },
})
