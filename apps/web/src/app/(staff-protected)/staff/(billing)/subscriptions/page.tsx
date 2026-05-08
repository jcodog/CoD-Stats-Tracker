import { renderStaffBillingPage } from "@/features/staff/billing/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Subscriptions Overview")

export default async function StaffSubscriptionsOverviewPage() {
  return renderStaffBillingPage("subscriptions-overview")
}
