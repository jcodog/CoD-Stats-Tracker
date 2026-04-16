import { redirect } from "next/navigation"

import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Invoices")

export default function BillingInvoicesSettingsPage() {
  redirect("/settings/billing")
}
