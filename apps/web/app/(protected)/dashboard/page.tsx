import { isFlagEnabled } from "@/lib/flags"
import { DashboardView } from "@/features/dashboard/views/DashboardView"

export default async function DashboardPage() {
  const dashboardStatsEditorEnabled = await isFlagEnabled("dashboardStatsEditor")

  if (!dashboardStatsEditorEnabled) {
    return <DashboardView />
  }

  const { DashboardStatsEditorView } = await import(
    "@/features/dashboard-stats/views/DashboardStatsEditorView"
  )

  return <DashboardStatsEditorView />
}
