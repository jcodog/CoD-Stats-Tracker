"use client"

import { useConvex, useConvexAuth } from "convex/react"
import type { ConvexReactClient } from "convex/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@workspace/backend/convex/_generated/api"
import type { Id } from "@workspace/backend/convex/_generated/dataModel"

export class DashboardStatsClientError extends Error {
  data: unknown
  status: number

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.data = data
    this.status = status
  }
}

function toDashboardStatsClientError(error: unknown) {
  if (error instanceof DashboardStatsClientError) {
    return error
  }

  const message =
    error instanceof Error ? error.message : "Dashboard stats request failed."
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500

  return new DashboardStatsClientError(message, status, error)
}

export const dashboardStatsQueryKeys = {
  all: ["dashboard-stats"] as const,
  dailyPerformance: (sessionId: string | null, includeLossProtected: boolean) =>
    [
      ...dashboardStatsQueryKeys.all,
      "daily-performance",
      sessionId,
      includeLossProtected,
    ] as const,
  maps: ["dashboard-stats", "maps"] as const,
  modes: ["dashboard-stats", "modes"] as const,
  recentMatches: (sessionId: string | null, includeLossProtected: boolean) =>
    [
      ...dashboardStatsQueryKeys.all,
      "recent-matches",
      sessionId,
      includeLossProtected,
    ] as const,
  sessionOverview: (sessionId: string | null, includeLossProtected: boolean) =>
    [
      ...dashboardStatsQueryKeys.all,
      "session-overview",
      sessionId,
      includeLossProtected,
    ] as const,
  srTimeline: (sessionId: string | null, includeLossProtected: boolean) =>
    [
      ...dashboardStatsQueryKeys.all,
      "sr-timeline",
      sessionId,
      includeLossProtected,
    ] as const,
  state: ["dashboard-stats", "state"] as const,
  usernames: ["dashboard-stats", "usernames"] as const,
  winLossBreakdown: (sessionId: string | null, includeLossProtected: boolean) =>
    [
      ...dashboardStatsQueryKeys.all,
      "win-loss-breakdown",
      sessionId,
      includeLossProtected,
    ] as const,
}

function asSessionId(sessionId: string | null) {
  return sessionId as Id<"sessions"> | null
}

async function queryCurrentDashboardState(convex: ConvexReactClient) {
  try {
    return await convex.query(api.queries.stats.dashboard.getCurrentDashboardState, {})
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function queryAvailableUsernames(convex: ConvexReactClient) {
  try {
    return await convex.query(
      api.queries.stats.dashboard.getAvailableActivisionUsernames,
      {}
    )
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function queryAvailableMaps(convex: ConvexReactClient) {
  try {
    return await convex.query(api.queries.stats.dashboard.getAvailableMapsForCurrentTitle, {})
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function queryAvailableModes(convex: ConvexReactClient) {
  try {
    return await convex.query(api.queries.stats.dashboard.getAvailableModesForCurrentTitle, {})
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function querySessionOverview(args: {
  convex: ConvexReactClient
  includeLossProtected: boolean
  sessionId: Id<"sessions">
}) {
  try {
    return await args.convex.query(api.queries.stats.dashboard.getSessionOverview, {
      includeLossProtected: args.includeLossProtected,
      sessionId: args.sessionId,
    })
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function querySessionSrTimeline(args: {
  convex: ConvexReactClient
  includeLossProtected: boolean
  sessionId: Id<"sessions">
}) {
  try {
    return await args.convex.query(api.queries.stats.dashboard.getSessionSrTimeline, {
      includeLossProtected: args.includeLossProtected,
      sessionId: args.sessionId,
    })
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function querySessionWinLossBreakdown(args: {
  convex: ConvexReactClient
  includeLossProtected: boolean
  sessionId: Id<"sessions">
}) {
  try {
    return await args.convex.query(
      api.queries.stats.dashboard.getSessionWinLossBreakdown,
      {
        includeLossProtected: args.includeLossProtected,
        sessionId: args.sessionId,
      }
    )
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function querySessionDailyPerformance(args: {
  convex: ConvexReactClient
  includeLossProtected: boolean
  sessionId: Id<"sessions">
}) {
  try {
    return await args.convex.query(api.queries.stats.dashboard.getSessionDailyPerformance, {
      includeLossProtected: args.includeLossProtected,
      sessionId: args.sessionId,
    })
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

async function queryRecentSessionMatches(args: {
  convex: ConvexReactClient
  includeLossProtected: boolean
  sessionId: Id<"sessions">
}) {
  try {
    return await args.convex.query(api.queries.stats.dashboard.getRecentSessionMatches, {
      includeLossProtected: args.includeLossProtected,
      sessionId: args.sessionId,
    })
  } catch (error) {
    throw toDashboardStatsClientError(error)
  }
}

export type DashboardState = Awaited<ReturnType<typeof queryCurrentDashboardState>>
export type DashboardAvailableMaps = Awaited<ReturnType<typeof queryAvailableMaps>>
export type DashboardAvailableModes = Awaited<ReturnType<typeof queryAvailableModes>>
export type DashboardAvailableUsernames = Awaited<
  ReturnType<typeof queryAvailableUsernames>
>
export type DashboardSessionOverview = Awaited<ReturnType<typeof querySessionOverview>>
export type DashboardSessionSrTimeline = Awaited<ReturnType<typeof querySessionSrTimeline>>
export type DashboardSessionWinLossBreakdown = Awaited<
  ReturnType<typeof querySessionWinLossBreakdown>
>
export type DashboardSessionDailyPerformance = Awaited<
  ReturnType<typeof querySessionDailyPerformance>
>
export type DashboardRecentSessionMatches = Awaited<
  ReturnType<typeof queryRecentSessionMatches>
>

export function useDashboardStatsState(
  initialData: DashboardState
) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    initialData,
    queryFn: () => queryCurrentDashboardState(convex),
    queryKey: dashboardStatsQueryKeys.state,
  })
}

export function useDashboardAvailableUsernames(enabled = true) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: enabled && !isLoading && isAuthenticated,
    queryFn: () => queryAvailableUsernames(convex),
    queryKey: dashboardStatsQueryKeys.usernames,
  })
}

export function useDashboardAvailableMaps() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryAvailableMaps(convex),
    queryKey: dashboardStatsQueryKeys.maps,
  })
}

export function useDashboardAvailableModes() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryAvailableModes(convex),
    queryKey: dashboardStatsQueryKeys.modes,
  })
}

export function useDashboardSessionOverview(
  sessionId: string | null,
  includeLossProtected: boolean
) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated && sessionId !== null,
    queryFn: () => {
      const resolvedSessionId = asSessionId(sessionId)

      if (!resolvedSessionId) {
        throw new Error("A session must be selected.")
      }

      return querySessionOverview({
        convex,
        includeLossProtected,
        sessionId: resolvedSessionId,
      })
    },
    queryKey: dashboardStatsQueryKeys.sessionOverview(
      sessionId,
      includeLossProtected
    ),
  })
}

export function useDashboardSessionSrTimeline(
  sessionId: string | null,
  includeLossProtected: boolean
) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated && sessionId !== null,
    queryFn: () => {
      const resolvedSessionId = asSessionId(sessionId)

      if (!resolvedSessionId) {
        throw new Error("A session must be selected.")
      }

      return querySessionSrTimeline({
        convex,
        includeLossProtected,
        sessionId: resolvedSessionId,
      })
    },
    queryKey: dashboardStatsQueryKeys.srTimeline(sessionId, includeLossProtected),
  })
}

export function useDashboardSessionWinLossBreakdown(
  sessionId: string | null,
  includeLossProtected: boolean
) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated && sessionId !== null,
    queryFn: () => {
      const resolvedSessionId = asSessionId(sessionId)

      if (!resolvedSessionId) {
        throw new Error("A session must be selected.")
      }

      return querySessionWinLossBreakdown({
        convex,
        includeLossProtected,
        sessionId: resolvedSessionId,
      })
    },
    queryKey: dashboardStatsQueryKeys.winLossBreakdown(
      sessionId,
      includeLossProtected
    ),
  })
}

export function useDashboardSessionDailyPerformance(
  sessionId: string | null,
  includeLossProtected: boolean
) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated && sessionId !== null,
    queryFn: () => {
      const resolvedSessionId = asSessionId(sessionId)

      if (!resolvedSessionId) {
        throw new Error("A session must be selected.")
      }

      return querySessionDailyPerformance({
        convex,
        includeLossProtected,
        sessionId: resolvedSessionId,
      })
    },
    queryKey: dashboardStatsQueryKeys.dailyPerformance(
      sessionId,
      includeLossProtected
    ),
  })
}

export function useDashboardRecentSessionMatches(
  sessionId: string | null,
  includeLossProtected: boolean
) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated && sessionId !== null,
    queryFn: () => {
      const resolvedSessionId = asSessionId(sessionId)

      if (!resolvedSessionId) {
        throw new Error("A session must be selected.")
      }

      return queryRecentSessionMatches({
        convex,
        includeLossProtected,
        sessionId: resolvedSessionId,
      })
    },
    queryKey: dashboardStatsQueryKeys.recentMatches(
      sessionId,
      includeLossProtected
    ),
    staleTime: 30_000,
  })
}

export function useCreateDashboardSession() {
  const convex = useConvex()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      existingUsernameId?: Id<"activisionUsernames">
      newUsername?: string
      startSr: number
    }) => {
      try {
        return await convex.mutation(api.mutations.stats.dashboard.createSession, input)
      } catch (error) {
        throw toDashboardStatsClientError(error)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardStatsQueryKeys.all })
    },
  })
}

export function useLogDashboardMatch() {
  const convex = useConvex()
  const queryClient = useQueryClient()

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
        return await convex.mutation(api.mutations.stats.dashboard.logMatch, input)
      } catch (error) {
        throw toDashboardStatsClientError(error)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardStatsQueryKeys.all })
    },
  })
}
