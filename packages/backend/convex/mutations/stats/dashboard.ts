import { v } from "convex/values"

import { internal } from "../../_generated/api"
import type { Doc } from "../../_generated/dataModel"
import { mutation, type MutationCtx } from "../../_generated/server"
import {
  applyGlobalLandingStatsDelta,
  applyUserLandingStatsDelta,
} from "../../lib/landingMetrics"
import {
  buildTitleSeasonKey,
  collectOwnedSessions,
  getCurrentRankedConfig,
  getOwnedSessionById,
  normalizeActivisionUsername,
  requireAuthenticatedStatsActor,
  sessionMatchesRankedConfig,
  trimOptionalText,
} from "../../lib/statsDashboard"
import { getStatsUserIdCandidatesForInvalidation } from "../../lib/userIds"

const NOTES_MAX_LENGTH = 280

function clampOptionalCount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Optional stat fields must be non-negative integers.")
  }

  return value
}

function assertStartSr(startSr: number) {
  if (!Number.isInteger(startSr) || startSr < 0 || startSr > 20000) {
    throw new Error("Start SR must be an integer between 0 and 20000.")
  }
}

async function invalidateLandingMetricsForUser(args: {
  ctx: MutationCtx
  userId: string
}) {
  const invalidationUserIds = await getStatsUserIdCandidatesForInvalidation(
    args.ctx,
    args.userId
  )

  await Promise.all(
    invalidationUserIds.map((invalidationUserId) =>
      args.ctx.scheduler.runAfter(
        0,
        internal.actions.stats.cache.invalidateLandingMetricsCache,
        {
          userId: invalidationUserId,
        }
      )
    )
  )
}

async function resolveOwnedUsername(args: {
  ctx: MutationCtx
  existingUsernameId?: Doc<"activisionUsernames">["_id"]
  newUsername?: string
  ownerUserId: Doc<"users">["_id"]
}) {
  const nextNewUsername = trimOptionalText(args.newUsername)

  if (args.existingUsernameId && nextNewUsername) {
    throw new Error("Choose an existing Activision username or enter a new one.")
  }

  if (!args.existingUsernameId && !nextNewUsername) {
    throw new Error("An Activision username is required.")
  }

  if (args.existingUsernameId) {
    const existingUsername = await args.ctx.db.get(args.existingUsernameId)

    if (!existingUsername || existingUsername.ownerUserId !== args.ownerUserId) {
      throw new Error("That Activision username is not available for this account.")
    }

    return existingUsername
  }

  const normalizedUsername = normalizeActivisionUsername(nextNewUsername!)

  if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
    throw new Error("Activision usernames must be between 3 and 32 characters.")
  }

  const existingUsername = await args.ctx.db
    .query("activisionUsernames")
    .withIndex("by_owner_normalized", (query) =>
      query
        .eq("ownerUserId", args.ownerUserId)
        .eq("normalizedUsername", normalizedUsername)
    )
    .unique()

  if (existingUsername) {
    return existingUsername
  }

  const now = Date.now()
  const usernameId = await args.ctx.db.insert("activisionUsernames", {
    createdAt: now,
    displayUsername: nextNewUsername!,
    lastUsedAt: now,
    normalizedUsername,
    ownerUserId: args.ownerUserId,
    updatedAt: now,
  })

  const username = await args.ctx.db.get(usernameId)
  if (!username) {
    throw new Error("Failed to create the Activision username.")
  }

  return username
}

async function resolveActiveRankedMode(args: {
  ctx: MutationCtx
  modeId: Doc<"rankedModes">["_id"]
  titleKey: string
}) {
  const mode = await args.ctx.db.get(args.modeId)

  if (!mode || !mode.isActive || mode.titleKey !== args.titleKey) {
    throw new Error("Choose an active ranked mode from the current title.")
  }

  return mode
}

async function resolveActiveRankedMap(args: {
  ctx: MutationCtx
  mapId: Doc<"rankedMaps">["_id"]
  modeId: Doc<"rankedModes">["_id"]
  titleKey: string
}) {
  const rankedMap = await args.ctx.db.get(args.mapId)

  if (!rankedMap || !rankedMap.isActive || rankedMap.titleKey !== args.titleKey) {
    throw new Error("Choose an active map from the current ranked title.")
  }

  if (!(rankedMap.supportedModeIds ?? []).includes(args.modeId)) {
    throw new Error("Choose a map that supports the selected ranked mode.")
  }

  return rankedMap
}

export const createSession = mutation({
  args: {
    existingUsernameId: v.optional(v.id("activisionUsernames")),
    newUsername: v.optional(v.string()),
    startSr: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedStatsActor(ctx)
    const { config, title } = await getCurrentRankedConfig(ctx)

    if (!config || !title || !title.isActive) {
      throw new Error(
        "Ranked session creation is unavailable until staff configure the active title."
      )
    }

    assertStartSr(args.startSr)

    const activisionUsername = await resolveOwnedUsername({
      ctx,
      existingUsernameId: args.existingUsernameId,
      newUsername: args.newUsername,
      ownerUserId: actor.user._id,
    })
    const titleSeasonKey = buildTitleSeasonKey(config.activeTitleKey, config.activeSeason)
    const ownedSessions = await collectOwnedSessions(ctx, actor)
    const activeCurrentSessions = ownedSessions.filter(
      (session) =>
        session.endedAt === null &&
        sessionMatchesRankedConfig({
          activeSeason: config.activeSeason,
          activeTitleKey: config.activeTitleKey,
          activeTitleLabel: title.label,
          session,
        })
    )
    const matchingSession = activeCurrentSessions.find(
      (session) =>
        session.activisionUsernameSnapshot &&
        normalizeActivisionUsername(session.activisionUsernameSnapshot) ===
          activisionUsername.normalizedUsername
    )
    const now = Date.now()

    if (actor.planKey === "free" && activeCurrentSessions.length > 0) {
      const existingSession = [...activeCurrentSessions].sort(
        (left, right) => right.startedAt - left.startedAt
      )[0]

      await ctx.db.patch(activisionUsername._id, {
        lastUsedAt: now,
        updatedAt: now,
      })

      return {
        created: false,
        reason: "free_limit_reused" as const,
        sessionId: existingSession._id,
      }
    }

    if (matchingSession) {
      await ctx.db.patch(activisionUsername._id, {
        lastUsedAt: now,
        updatedAt: now,
      })

      return {
        created: false,
        reason: "username_reused" as const,
        sessionId: matchingSession._id,
      }
    }

    const sessionId = await ctx.db.insert("sessions", {
      activisionUsernameId: activisionUsername._id,
      activisionUsernameSnapshot: activisionUsername.displayUsername,
      bestStreak: 0,
      codTitle: title.label,
      currentSr: args.startSr,
      deaths: 0,
      endedAt: null,
      kills: 0,
      lastMatchLoggedAt: undefined,
      losses: 0,
      matchCount: 0,
      ownerUserId: actor.user._id,
      season: config.activeSeason,
      startSr: args.startSr,
      startedAt: now,
      streak: 0,
      titleKey: title.key,
      titleLabelSnapshot: title.label,
      titleSeasonKey,
      userId: actor.user.discordId,
      uuid: crypto.randomUUID(),
      wins: 0,
    })

    await ctx.db.patch(activisionUsername._id, {
      isPrimary: activisionUsername.isPrimary ?? true,
      lastUsedAt: now,
      updatedAt: now,
    })

    const statsDelta = {
      activeSessions: 1,
      sessionsTracked: 1,
    }

    await applyGlobalLandingStatsDelta(ctx, statsDelta)
    await applyUserLandingStatsDelta(ctx, actor.user.discordId, statsDelta)
    await invalidateLandingMetricsForUser({
      ctx,
      userId: actor.user.discordId,
    })

    return {
      created: true,
      reason: "created" as const,
      sessionId,
    }
  },
})

export const logMatch = mutation({
  args: {
    deaths: v.optional(v.union(v.null(), v.number())),
    defuses: v.optional(v.union(v.null(), v.number())),
    enemyScore: v.optional(v.union(v.null(), v.number())),
    hillTimeSeconds: v.optional(v.union(v.null(), v.number())),
    kills: v.optional(v.union(v.null(), v.number())),
    lossProtected: v.optional(v.boolean()),
    mapId: v.id("rankedMaps"),
    modeId: v.id("rankedModes"),
    notes: v.optional(v.string()),
    outcome: v.union(v.literal("win"), v.literal("loss")),
    overloads: v.optional(v.union(v.null(), v.number())),
    plants: v.optional(v.union(v.null(), v.number())),
    sessionId: v.id("sessions"),
    srChange: v.number(),
    teamScore: v.optional(v.union(v.null(), v.number())),
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

    if (session.endedAt !== null) {
      throw new Error("Archived sessions are read-only and cannot accept new logs.")
    }

    const { config, title } = await getCurrentRankedConfig(ctx)
    if (!config || !title || !title.isActive) {
      throw new Error("Ranked logging is unavailable until staff configure the active title.")
    }

    if (
      !sessionMatchesRankedConfig({
        activeSeason: config.activeSeason,
        activeTitleKey: config.activeTitleKey,
        activeTitleLabel: title.label,
        session,
      })
    ) {
      throw new Error("This session is no longer active for the current title and season.")
    }

    const rankedMode = await resolveActiveRankedMode({
      ctx,
      modeId: args.modeId,
      titleKey: config.activeTitleKey,
    })
    const rankedMap = await resolveActiveRankedMap({
      ctx,
      mapId: args.mapId,
      modeId: rankedMode._id,
      titleKey: config.activeTitleKey,
    })

    const notes = trimOptionalText(args.notes)
    if (notes && notes.length > NOTES_MAX_LENGTH) {
      throw new Error(`Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`)
    }

    const kills = clampOptionalCount(args.kills)
    const deaths = clampOptionalCount(args.deaths)
    const teamScore = clampOptionalCount(args.teamScore)
    const enemyScore = clampOptionalCount(args.enemyScore)
    const hillTimeSeconds = clampOptionalCount(args.hillTimeSeconds)
    const plants = clampOptionalCount(args.plants)
    const defuses = clampOptionalCount(args.defuses)
    const overloads = clampOptionalCount(args.overloads)
    const lossProtected = args.lossProtected ?? false
    const now = Date.now()

    const matchId = await ctx.db.insert("games", {
      createdAt: now,
      deaths,
      defuses,
      enemyScore,
      hillTimeSeconds,
      kills,
      lossProtected,
      mapId: rankedMap._id,
      mapNameSnapshot: rankedMap.name,
      mode: rankedMode.label,
      modeId: rankedMode._id,
      notes,
      outcome: args.outcome,
      overloads,
      ownerUserId: actor.user._id,
      plants,
      sessionId: session.uuid,
      srChange: args.srChange,
      teamScore,
      userId: actor.user.discordId,
    })

    const updatedStreak = args.outcome === "win" ? session.streak + 1 : 0

    await ctx.db.patch(session._id, {
      bestStreak: Math.max(session.bestStreak, updatedStreak),
      currentSr: session.currentSr + args.srChange,
      deaths: session.deaths + (deaths ?? 0),
      kills: session.kills + (kills ?? 0),
      lastMatchLoggedAt: now,
      losses: args.outcome === "loss" ? session.losses + 1 : session.losses,
      matchCount: (session.matchCount ?? session.wins + session.losses) + 1,
      streak: updatedStreak,
      wins: args.outcome === "win" ? session.wins + 1 : session.wins,
    })

    const statsDelta = {
      losses: args.outcome === "loss" ? 1 : 0,
      matchesIndexed: 1,
      wins: args.outcome === "win" ? 1 : 0,
    }

    await applyGlobalLandingStatsDelta(ctx, statsDelta)
    await applyUserLandingStatsDelta(ctx, actor.user.discordId, statsDelta)
    await invalidateLandingMetricsForUser({
      ctx,
      userId: actor.user.discordId,
    })

    return {
      matchId,
      sessionId: session._id,
    }
  },
})
