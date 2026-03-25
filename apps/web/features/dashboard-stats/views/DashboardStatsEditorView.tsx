import "server-only"

import { auth } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"
import { DashboardStatsEditorClient } from "@/features/dashboard-stats/components/DashboardStatsEditorClient"

export async function DashboardStatsEditorView() {
  const { getToken } = await auth()
  const token = await getToken({ template: "convex" }).catch(() => null)

  if (!token) {
    return (
      <div className="relative left-1/2 right-1/2 w-[min(100vw-2rem,88rem)] -translate-x-1/2 sm:w-[min(100vw-3rem,88rem)] lg:w-[min(100vw-4rem,88rem)]">
        <DashboardStatsEditorClient
          authFailed
          initialDashboardState={null}
        />
      </div>
    )
  }

  const initialDashboardState = await fetchQuery(
    api.queries.stats.dashboard.getCurrentDashboardState,
    {},
    { token }
  )

  return (
    <div className="relative left-1/2 right-1/2 w-[min(100vw-2rem,88rem)] -translate-x-1/2 sm:w-[min(100vw-3rem,88rem)] lg:w-[min(100vw-4rem,88rem)]">
      <DashboardStatsEditorClient initialDashboardState={initialDashboardState} />
    </div>
  )
}
