import { BillingSettingsView } from "@/features/billing/views/BillingSettingsView"
import { isFlagEnabled } from "@/lib/flags"

export default async function BillingInvoicesSettingsPage() {
  const checkoutEnabled = await isFlagEnabled("checkout")

  return (
    <BillingSettingsView checkoutEnabled={checkoutEnabled} section="invoices" />
  )
}
