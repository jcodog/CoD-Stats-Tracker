import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import {
  PricingComparisonDesktop,
  PricingIntro,
  PricingPlanList,
} from "@/features/pricing/components/PricingSections"
import type { PendingCreatorCodeSummary } from "@/lib/server/creator-attribution"

export function PricingDesktopView({
  catalog,
  pendingCreatorCode,
}: {
  catalog: PricingCatalogResponse
  pendingCreatorCode?: PendingCreatorCodeSummary | null
}) {
  return (
    <div className="grid gap-10 lg:gap-12">
      <PricingIntro
        availableCurrencies={catalog.availableCurrencies}
        currencyNotice={catalog.currencyNotice}
        pendingCreatorCode={pendingCreatorCode}
        selectedCurrency={catalog.selectedCurrency}
      />
      <PricingPlanList catalog={catalog} viewport="desktop" />
      <PricingComparisonDesktop catalog={catalog} />
    </div>
  )
}
