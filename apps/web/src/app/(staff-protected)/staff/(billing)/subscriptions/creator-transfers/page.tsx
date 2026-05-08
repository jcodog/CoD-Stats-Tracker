import { renderStaffBillingPage } from "@/features/staff/billing/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Creator Transfers")

export default async function StaffSubscriptionsCreatorTransfersPage() {
  return renderStaffBillingPage("subscriptions-creator-transfers")
}
