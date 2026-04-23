import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import {
  PricingComparisonDesktop,
  PricingIntro,
  PricingPlanList,
} from "@/features/pricing/components/PricingSections"

export function PricingDesktopView({
  catalog,
}: {
  catalog: PricingCatalogResponse
}) {
  return (
    <div className="grid gap-10 lg:gap-12">
      <PricingIntro />
      <PricingPlanList catalog={catalog} viewport="desktop" />
      <PricingComparisonDesktop catalog={catalog} />
    </div>
  )
}
