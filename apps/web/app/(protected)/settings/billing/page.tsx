import { BillingSettingsView } from "@/features/billing/views/BillingSettingsView"
import { isFlagEnabled } from "@/lib/flags"
import { resolveRequestViewport } from "@/lib/server/request-viewport"
import { redirect } from "next/navigation"

export default async function BillingSettingsPage() {
  const [checkoutEnabled, viewport] = await Promise.all([
    isFlagEnabled("checkout"),
    resolveRequestViewport(),
  ])

  if (!checkoutEnabled) {
    redirect("/dashboard")
  }

  return <BillingSettingsView checkoutEnabled={checkoutEnabled} viewport={viewport} />
}
