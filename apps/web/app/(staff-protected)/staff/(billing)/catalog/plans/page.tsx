import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Plans")

export default async function StaffCatalogPlansPage() {
  return renderStaffBillingPage("catalog-plans")
}
