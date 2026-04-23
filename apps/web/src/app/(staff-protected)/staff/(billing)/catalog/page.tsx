import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Catalog Overview")

export default async function StaffCatalogOverviewPage() {
  return renderStaffBillingPage("catalog-overview")
}
