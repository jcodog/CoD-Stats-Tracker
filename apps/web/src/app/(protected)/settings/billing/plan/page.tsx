import { UpgradePlanView } from "@/features/billing/views/UpgradePlanView"
import { createPageMetadata } from "@/lib/metadata/page"
import { getPreferredPricingCurrency } from "@/lib/server/pricing-currency"

export const metadata = createPageMetadata("Plan")

export default async function BillingPlanSettingsPage() {
  const preferredCurrency = await getPreferredPricingCurrency()

  return <UpgradePlanView preferredCurrency={preferredCurrency} />
}
