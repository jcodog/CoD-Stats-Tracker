import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import {
  PricingComparisonMobile,
  PricingIntro,
  PricingPlanList,
} from "@/features/pricing/components/PricingSections"
import type { PendingCreatorCodeSummary } from "@/lib/server/creator-attribution"

export function PricingMobileView({
  catalog,
  pendingCreatorCode,
}: {
  catalog: PricingCatalogResponse
  pendingCreatorCode?: PendingCreatorCodeSummary | null
}) {
  return (
    <div className="grid gap-8">
      <PricingIntro
        availableCurrencies={catalog.availableCurrencies}
        currencyNotice={catalog.currencyNotice}
        pendingCreatorCode={pendingCreatorCode}
        selectedCurrency={catalog.selectedCurrency}
      />
      <PricingPlanList catalog={catalog} viewport="mobile" />
      <PricingComparisonMobile catalog={catalog} />
    </div>
  )
}
