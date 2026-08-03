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
  signedIn,
}: {
  catalog: PricingCatalogResponse
  pendingCreatorCode?: PendingCreatorCodeSummary | null
  signedIn: boolean
}) {
  return (
    <div className="grid gap-8">
      <PricingIntro
        availableCurrencies={catalog.availableCurrencies}
        currencyNotice={catalog.currencyNotice}
        pendingCreatorCode={pendingCreatorCode}
        selectedCurrency={catalog.selectedCurrency}
      />
      <PricingPlanList
        catalog={catalog}
        signedIn={signedIn}
        viewport="mobile"
      />
      <PricingComparisonMobile catalog={catalog} />
    </div>
  )
}
