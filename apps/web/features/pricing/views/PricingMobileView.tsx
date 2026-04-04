import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import {
  PricingComparisonMobile,
  PricingIntro,
  PricingPlanList,
} from "@/features/pricing/components/PricingSections"

export function PricingMobileView({
  catalog,
}: {
  catalog: PricingCatalogResponse
}) {
  return (
    <div className="grid gap-8">
      <PricingIntro />
      <PricingPlanList catalog={catalog} viewport="mobile" />
      <PricingComparisonMobile catalog={catalog} />
    </div>
  )
}
