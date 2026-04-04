import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Features")

export default async function StaffCatalogFeaturesPage() {
  return renderStaffBillingPage("catalog-features")
}
