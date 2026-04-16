import "server-only"

import { auth } from "@clerk/nextjs/server"

import { DashboardStatsEditorClient } from "@/features/dashboard-stats/components/DashboardStatsEditorClient"
import { resolveDashboardStatsEditorInitialState } from "@/features/dashboard-stats/lib/dashboard-stats-server"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export async function DashboardStatsEditorView() {
  const { getToken } = await auth()
  const token = await getToken({ template: "convex" }).catch(() => null)
  const viewport = await resolveRequestViewport()
  const initialState = await resolveDashboardStatsEditorInitialState({
    token,
    onError: (error) => {
      console.error("Dashboard stats initial load failed", error)
    },
  })

  return (
    <div className="w-full">
      <DashboardStatsEditorClient
        authFailed={initialState.authFailed}
        initialDashboardState={initialState.initialDashboardState}
        viewport={viewport}
      />
    </div>
  )
}
