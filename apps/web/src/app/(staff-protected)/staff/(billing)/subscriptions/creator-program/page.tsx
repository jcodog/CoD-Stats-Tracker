import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Creator Program")

export default async function StaffSubscriptionsCreatorProgramPage() {
  return renderStaffBillingPage("subscriptions-creator-program")
}
