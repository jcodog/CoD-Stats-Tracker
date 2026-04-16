import { redirect } from "next/navigation"

import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Audit Log")

export default async function StaffCatalogAuditPage() {
  redirect("/staff/catalog/audit-log")
}
