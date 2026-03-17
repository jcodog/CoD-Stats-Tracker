import { BillingSettingsView } from "@/features/billing/views/BillingSettingsView"
import { isFlagEnabled } from "@/lib/flags"
import { redirect } from "next/navigation"

export default async function BillingSettingsPage() {
  const checkoutEnabled = await isFlagEnabled("checkout")

  if (!checkoutEnabled) {
    redirect("/dashboard")
  }

  return (
    <BillingSettingsView checkoutEnabled={checkoutEnabled} />
  )
}
