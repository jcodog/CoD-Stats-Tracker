import "server-only"

import { getViewerSession } from "@/lib/server/viewer"

import { DashboardStatsEditorClient } from "@/features/dashboard-stats/components/editor/EditorClient"
import { resolveDashboardStatsEditorInitialState } from "@/features/dashboard-stats/lib/server/initial-state"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export async function DashboardStatsEditorView() {
  const { convexToken: token } = await getViewerSession()
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
