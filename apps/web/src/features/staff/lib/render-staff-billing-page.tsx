import { fetchAction } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"

import { StaffAccessState } from "@/features/staff/components/StaffAccessState"
import { getStaffBillingSectionConfig } from "@/features/staff/lib/staff-billing-sections"
import type { StaffBillingSection } from "@/features/staff/lib/staff-billing-sections"
import { StaffBillingView } from "@/features/staff/views/StaffBillingView"
import { requireAdminAccess, requireStaffAccess } from "@/lib/server/staff-auth"

export async function renderStaffBillingPage(section: StaffBillingSection) {
  const sectionConfig = getStaffBillingSectionConfig(section)
  const access =
    sectionConfig.minimumRole === "admin"
      ? await requireAdminAccess()
      : await requireStaffAccess()

  if (!access.ok) {
    return <StaffAccessState access={access} />
  }

  const initialData = await fetchAction(
    api.actions.staff.billing.getDashboard,
    {},
    {
      token: access.convexToken,
    }
  )

  return (
    <StaffBillingView
      actorRole={access.convexRole}
      initialData={initialData}
      section={section}
    />
  )
}
