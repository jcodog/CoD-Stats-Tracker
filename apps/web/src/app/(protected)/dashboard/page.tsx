import { DashboardStatsEditorView } from "@/features/dashboard-stats/views/DashboardStatsEditorView"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Dashboard")

export default function DashboardPage() {
  return <DashboardStatsEditorView />
}
