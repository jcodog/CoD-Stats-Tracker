"use client"

import {
  useConvex,
  useConvexAuth,
  useQueries,
  usePaginatedQuery,
} from "convex/react"
import { useMemo } from "react"
import { projectSessionHistory } from "@workspace/backend/lib/statsAnalytics"
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server"
import { useMutation } from "@tanstack/react-query"
import { api } from "@workspace/backend/convex/_generated/api"
import type { Id } from "@workspace/backend/convex/_generated/dataModel"
import type { DashboardMatchLoggingMode } from "@/features/dashboard-stats/lib/log-match/mode"

export class DashboardStatsClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown
  ) {
    super(message)
  }
}
function toDashboardStatsClientError(error: unknown) {
  return error instanceof DashboardStatsClientError
    ? error
    : new DashboardStatsClientError(
        error instanceof Error
          ? error.message
          : "Dashboard stats request failed.",
        500,
        error
      )
}

const queries = api.queries.stats.dashboard
export type DashboardState = FunctionReturnType<
  typeof queries.getCurrentDashboardState
>
export type DashboardAvailableMaps = DashboardState["availableMaps"]
export type DashboardAvailableModes = DashboardState["availableModes"]
export type DashboardAvailableUsernames = FunctionReturnType<
  typeof queries.getAvailableActivisionUsernames
>
type Analytics = ReturnType<typeof projectSessionHistory>
export type DashboardSessionOverview = FunctionReturnType<
  typeof queries.getSessionOverview
>
export type DashboardSessionSrTimeline = Analytics["srTimeline"]
export type DashboardSessionDailyPerformance = Analytics["dailyPerformance"]
export type DashboardRecentSessionMatches = FunctionReturnType<
  typeof queries.getRecentSessionMatches
>
export type DashboardSessionWinLossBreakdown = {
  items: { key: string; label: string; value: number }[]
  total: number
  wins: number
  losses: number
}

// Convex owns subscription lifetime and freshness. Keep errors local to the dashboard UI.
function useDashboardQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query> | "skip"
) {
  const { isAuthenticated } = useConvexAuth()
  const result: FunctionReturnType<Query> | Error | undefined = useQueries(
    isAuthenticated && args !== "skip" ? { result: { query, args } } : {}
  ).result
  const error =
    result instanceof Error ? toDashboardStatsClientError(result) : null
  return {
    data: result instanceof Error ? undefined : result,
    error,
    isError: error !== null,
    isPending: result === undefined,
  }
}

export function useDashboardStatsState(initialData: DashboardState) {
  const result = useDashboardQuery(queries.getCurrentDashboardState, {})
  return { ...result, data: result.data ?? initialData }
}

export function useDashboardAvailableUsernames(enabled = true) {
  return useDashboardQuery(
    queries.getAvailableActivisionUsernames,
    enabled ? {} : "skip"
  )
}

export function useDashboardSessionAnalytics(
  sessionId: Id<"sessions"> | null,
  includeLossProtected: boolean
) {
  const { isAuthenticated } = useConvexAuth()
  const overview = useDashboardQuery(
    queries.getSessionOverview,
    sessionId ? { sessionId, includeLossProtected } : "skip"
  )
  const recent = useDashboardQuery(
    queries.getRecentSessionMatches,
    sessionId ? { sessionId, includeLossProtected, limit: 50 } : "skip"
  )
  const history = usePaginatedQuery(
    queries.getSessionHistoryPage,
    isAuthenticated && sessionId ? { sessionId } : "skip",
    { initialNumItems: 200 }
  )
  const data = useMemo(
    () =>
      overview.data && recent.data && history.status !== "LoadingFirstPage"
        ? {
            overview: overview.data,
            recentMatches: recent.data,
            ...projectSessionHistory(
              overview.data,
              history.results,
              includeLossProtected
            ),
          }
        : undefined,
    [
      overview.data,
      recent.data,
      history.results,
      history.status,
      includeLossProtected,
    ]
  )
  return {
    data,
    isError: overview.isError || recent.isError,
    isPending:
      overview.isPending ||
      recent.isPending ||
      history.status === "LoadingFirstPage",
    historyComplete: history.status === "Exhausted",
    historyCount: history.results.length,
    historyLoading: history.isLoading,
    loadMoreHistory: () => history.loadMore(200),
  }
}
export function useCreateDashboardSession() {
  const convex = useConvex()

  return useMutation({
    mutationFn: async (input: {
      existingUsernameId?: Id<"activisionUsernames">
      newUsername?: string
      startSr: number
    }) => {
      try {
        return await convex.mutation(
          api.mutations.stats.dashboard.createSession,
          input
        )
      } catch (error) {
        throw toDashboardStatsClientError(error)
      }
    },
  })
}

export function useUpdateDashboardPreferredMatchLoggingMode() {
  const convex = useConvex()

  return useMutation({
    mutationFn: async (
      preferredMatchLoggingMode: DashboardMatchLoggingMode
    ) => {
      return await convex.mutation(
        api.mutations.stats.dashboard.updatePreferredMatchLoggingMode,
        { preferredMatchLoggingMode }
      )
    },
  })
}

export function useLogDashboardMatch() {
  const convex = useConvex()

  return useMutation({
    mutationFn: async (input: {
      deaths?: number | null
      defuses?: number | null
      enemyScore?: number | null
      hillTimeSeconds?: number | null
      kills?: number | null
      lossProtected?: boolean
      mapId: Id<"rankedMaps">
      modeId: Id<"rankedModes">
      notes?: string
      outcome: "loss" | "win"
      overloads?: number | null
      plants?: number | null
      sessionId: Id<"sessions">
      srChange: number
      teamScore?: number | null
    }) => {
      try {
        return await convex.mutation(
          api.mutations.stats.dashboard.logMatch,
          input
        )
      } catch (error) {
        throw toDashboardStatsClientError(error)
      }
    },
  })
}
