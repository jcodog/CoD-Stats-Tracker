import { renderStaffBillingPage } from "@/features/staff/billing/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Customers")

export default async function StaffSubscriptionsCustomersPage() {
  return renderStaffBillingPage("subscriptions-customers")
}
