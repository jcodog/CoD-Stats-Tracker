import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Operations")

export default async function StaffCatalogOperationsPage() {
  return renderStaffBillingPage("catalog-operations")
}
