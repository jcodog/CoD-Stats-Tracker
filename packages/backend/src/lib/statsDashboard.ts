import type { Doc, Id } from "../../convex/_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../../convex/_generated/server"
import { buildResolvedBillingState } from "../../convex/queries/billing/resolution"
import { resolveAppPlanKeyFromState, type AppPlanKey } from "./billingAccess"
import { getStatsUserIdCandidates } from "./userIds"

type StatsDashboardCtx =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">

export const MATCH_MODE_VALUES = ["hardpoint", "snd", "overload"] as const
export const SESSION_ARCHIVE_REASONS = [
  "title_rollover",
  "season_rollover",
  "title_and_season_rollover",
] as const

export type MatchMode = (typeof MATCH_MODE_VALUES)[number]
export type SessionArchiveReason = (typeof SESSION_ARCHIVE_REASONS)[number]

export type AuthenticatedStatsActor = {
  planKey: AppPlanKey
  statsUserIdCandidates: string[]
  user: Doc<"users">
}

export function buildTitleSeasonKey(titleKey: string, season: number) {
  return `${titleKey.trim().toLowerCase()}::${season}`
}

export function normalizeStatsLookupValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeActivisionUsername(value: string) {
  return value.trim().toLowerCase()
}

export function trimOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

export function isLegacySessionOwnedByActor(
  session: Pick<Doc<"sessions">, "ownerUserId" | "userId">,
  actor: Pick<AuthenticatedStatsActor, "statsUserIdCandidates" | "user">
) {
  if (session.ownerUserId) {
    return session.ownerUserId === actor.user._id
  }

  return actor.statsUserIdCandidates.includes(session.userId)
}

export function getSessionDisplayTitle(
  session: Pick<Doc<"sessions">, "codTitle" | "titleLabelSnapshot">
) {
  return session.titleLabelSnapshot ?? session.codTitle
}

export function getSessionUsernameLabel(
  session: Pick<Doc<"sessions">, "activisionUsernameSnapshot">
) {
  return session.activisionUsernameSnapshot ?? "Legacy session"
}

export function getSessionMatchCount(
  session: Pick<Doc<"sessions">, "losses" | "matchCount" | "wins">
) {
  return session.matchCount ?? session.wins + session.losses
}

export function sessionMatchesRankedConfig(args: {
  activeSeason: number
  activeTitleKey: string
  activeTitleLabel: string
  session: Pick<Doc<"sessions">, "codTitle" | "season" | "titleKey">
}) {
  if (args.session.season !== args.activeSeason) {
    return false
  }

  if (args.session.titleKey) {
    return (
      normalizeStatsLookupValue(args.session.titleKey) ===
      normalizeStatsLookupValue(args.activeTitleKey)
    )
  }

  const legacyTitle = normalizeStatsLookupValue(args.session.codTitle)
  return (
    legacyTitle === normalizeStatsLookupValue(args.activeTitleKey) ||
    legacyTitle === normalizeStatsLookupValue(args.activeTitleLabel)
  )
}

export async function requireAuthenticatedStatsIdentity(ctx: StatsDashboardCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error(
      "A signed-in session is required to access dashboard stats."
    )
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (query) =>
      query.eq("clerkUserId", identity.subject)
    )
    .unique()

  if (!user) {
    throw new Error("Unable to resolve your CodStats account.")
  }

  return { user, statsUserIdCandidates: getStatsUserIdCandidates(identity, user) }
}

export async function requireAuthenticatedStatsActor(ctx: StatsDashboardCtx): Promise<AuthenticatedStatsActor> {
  const actor = await requireAuthenticatedStatsIdentity(ctx)
  const billingState = await buildResolvedBillingState(ctx, actor.user)
  return { ...actor, planKey: resolveAppPlanKeyFromState({ fallbackPlanKey: actor.user.plan, state: billingState }) }
}
export async function getCurrentRankedConfig(
  ctx: Pick<QueryCtx | MutationCtx, "db">
) {
  const config = await ctx.db
    .query("rankedConfigs")
    .withIndex("by_key", (query) => query.eq("key", "current"))
    .unique()

  if (!config) {
    return {
      config: null,
      title: null,
    }
  }

  const title = await ctx.db
    .query("rankedTitles")
    .withIndex("by_key", (query) => query.eq("key", config.activeTitleKey))
    .unique()

  return {
    config,
    title,
  }
}

export function isRankedSessionWritesEnabled(
  config: Pick<Doc<"rankedConfigs">, "sessionWritesEnabled"> | null | undefined
) {
  return config?.sessionWritesEnabled !== false
}

export async function collectActiveOwnedSessions(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  actor: Pick<AuthenticatedStatsActor, "statsUserIdCandidates" | "user">
) {
  const [ownerSessions, ...legacySessionGroups] = await Promise.all([
    ctx.db
      .query("sessions")
      .withIndex("by_owner_ended_startedAt", (query) =>
        query.eq("ownerUserId", actor.user._id).eq("endedAt", null)
      )
      .order("desc")
      .take(501),
    ...actor.statsUserIdCandidates.map((candidate) =>
      ctx.db
        .query("sessions")
        .withIndex("by_legacy_user_ended_startedAt", (query) =>
          query.eq("userId", candidate).eq("ownerUserId", undefined).eq("endedAt", null)
        )
        .take(501)
    ),
  ])

  if ([ownerSessions, ...legacySessionGroups].some((sessions) => sessions.length > 500)) {
    throw new Error("Too many active sessions to load safely. Contact support to archive older sessions.")
  }

  const dedupedSessions = new Map<Id<"sessions">, Doc<"sessions">>()

  for (const session of ownerSessions) {
    dedupedSessions.set(session._id, session)
  }

  for (const sessionGroup of legacySessionGroups) {
    for (const session of sessionGroup) {
      if (isLegacySessionOwnedByActor(session, actor)) {
        dedupedSessions.set(session._id, session)
      }
    }
  }

  return Array.from(dedupedSessions.values()).sort(
    (left, right) =>
      right.startedAt - left.startedAt ||
      right._creationTime - left._creationTime
  )
}

export async function getOwnedSessionById(args: {
  actor: Pick<AuthenticatedStatsActor, "statsUserIdCandidates" | "user">
  ctx: Pick<QueryCtx | MutationCtx, "db">
  sessionId: Id<"sessions">
}) {
  const session = await args.ctx.db.get(args.sessionId)

  if (!session || !isLegacySessionOwnedByActor(session, args.actor)) {
    return null
  }

  return session
}

