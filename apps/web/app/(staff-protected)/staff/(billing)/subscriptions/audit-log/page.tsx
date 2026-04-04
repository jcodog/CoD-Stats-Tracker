import { fetchAction } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"

import { StaffAccessState } from "@/features/staff/components/StaffAccessState"
import { StaffWebhookEventsView } from "@/features/staff/views/StaffWebhookEventsView"
import { createPageMetadata } from "@/lib/metadata/page"
import { requireAdminAccess } from "@/lib/server/staff-auth"

export const metadata = createPageMetadata("Subscription Audit Log")

export default async function StaffSubscriptionsAuditLogPage() {
  const access = await requireAdminAccess()

  if (!access.ok) {
    return <StaffAccessState access={access} />
  }

  const initialData = await fetchAction(
    api.actions.staff.billing.getWebhookDashboard,
    {},
    {
      token: access.convexToken,
    }
  )

  return <StaffWebhookEventsView initialData={initialData} />
}
