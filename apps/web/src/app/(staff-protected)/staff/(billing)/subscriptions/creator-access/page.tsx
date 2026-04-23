import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Creator Access")

export default async function StaffSubscriptionsCreatorAccessPage() {
  return renderStaffBillingPage("subscriptions-creator-access")
}
