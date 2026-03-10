import { BillingSettingsView } from "@/features/billing/views/BillingSettingsView"
import { isFlagEnabled } from "@/lib/flags"

export default async function BillingSettingsPage() {
  const checkoutEnabled = await isFlagEnabled("checkout")

  return (
    <BillingSettingsView checkoutEnabled={checkoutEnabled} section="overview" />
  )
}
