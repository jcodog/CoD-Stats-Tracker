import { fetchAction } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"
import { StaffAccessState } from "@/features/staff/components/StaffAccessState"
import { StaffRankedStatsView } from "@/features/staff/views/StaffRankedStatsView"
import { requireStaffAccess } from "@/lib/server/staff-auth"

export default async function StaffRankedPage() {
  const access = await requireStaffAccess()

  if (!access.ok) {
    return <StaffAccessState access={access} />
  }

  const initialData = await fetchAction(api.actions.staff.ranked.getDashboard, {}, {
    token: access.convexToken,
  })

  return <StaffRankedStatsView initialData={initialData} />
}
