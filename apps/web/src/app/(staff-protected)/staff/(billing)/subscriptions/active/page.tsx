import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Active Subscriptions")

export default async function StaffSubscriptionsActivePage() {
  return renderStaffBillingPage("subscriptions-active")
}
