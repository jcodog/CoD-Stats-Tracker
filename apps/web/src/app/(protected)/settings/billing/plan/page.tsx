import { redirect } from "next/navigation"

import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Plan")

export default function BillingPlanSettingsPage() {
  redirect("/settings/billing")
}
