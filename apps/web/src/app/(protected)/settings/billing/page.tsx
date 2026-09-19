import { BillingSettingsView } from "@/features/billing/views/BillingSettingsView"
import { isFlagEnabled } from "@/lib/flags"
import { createPageMetadata } from "@/lib/metadata/page"
import { redirect } from "next/navigation"

export const metadata = createPageMetadata("Billing")

export default async function BillingSettingsPage() {
  const checkoutEnabled = await isFlagEnabled("checkout")

  if (!checkoutEnabled) {
    redirect("/dashboard")
  }

  return (
    <BillingSettingsView
      checkoutEnabled={checkoutEnabled}
    />
  )
}
