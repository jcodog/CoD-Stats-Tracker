import "server-only"

import { auth } from "@clerk/nextjs/server"

import { DashboardStatsEditorClient } from "@/features/dashboard-stats/components/DashboardStatsEditorClient"
import { resolveDashboardStatsEditorInitialState } from "@/features/dashboard-stats/lib/dashboard-stats-server"

export async function DashboardStatsEditorView() {
  const { getToken } = await auth()
  const token = await getToken({ template: "convex" }).catch(() => null)
  const initialState = await resolveDashboardStatsEditorInitialState({
    token,
    onError: (error) => {
      console.error("Dashboard stats initial load failed", error)
    },
  }
  )

  return (
    <div className="relative left-1/2 right-1/2 w-[min(100vw-2rem,88rem)] -translate-x-1/2 sm:w-[min(100vw-3rem,88rem)] lg:w-[min(100vw-4rem,88rem)]">
      <DashboardStatsEditorClient
        authFailed={initialState.authFailed}
        initialDashboardState={initialState.initialDashboardState}
      />
    </div>
  )
}
