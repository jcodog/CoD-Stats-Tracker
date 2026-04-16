import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Assignments")

export default async function StaffCatalogAssignmentsPage() {
  return renderStaffBillingPage("catalog-assignments")
}
