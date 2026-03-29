import { fetchQuery } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"
import type { DashboardState } from "@/features/dashboard-stats/lib/dashboard-stats-client"

export type DashboardStatsEditorInitialState = {
  authFailed: boolean
  initialDashboardState: DashboardState | null
}

type ResolveDashboardStatsEditorInitialStateArgs = {
  fetchDashboardState?: (token: string) => Promise<DashboardState>
  onError?: (error: unknown) => void
  token: string | null
}

async function defaultFetchDashboardState(token: string) {
  return await fetchQuery(
    api.queries.stats.dashboard.getCurrentDashboardState,
    {},
    { token }
  )
}

export async function resolveDashboardStatsEditorInitialState({
  fetchDashboardState = defaultFetchDashboardState,
  onError,
  token,
}: ResolveDashboardStatsEditorInitialStateArgs): Promise<DashboardStatsEditorInitialState> {
  if (!token) {
    return {
      authFailed: true,
      initialDashboardState: null,
    }
  }

  try {
    return {
      authFailed: false,
      initialDashboardState: await fetchDashboardState(token),
    }
  } catch (error) {
    onError?.(error)

    return {
      authFailed: false,
      initialDashboardState: null,
    }
  }
}
