import { renderStaffBillingPage } from "@/features/staff/lib/render-staff-billing-page"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Audit Log")

export default async function StaffCatalogAuditLogPage() {
  return renderStaffBillingPage("catalog-audit")
}
