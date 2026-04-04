import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Customers")

export default async function StaffSubscriptionsCustomersPage() {
  return renderStaffBillingPage("subscriptions-customers")
}
