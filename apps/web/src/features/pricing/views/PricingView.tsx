import { auth } from "@clerk/nextjs/server"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"
import { getPreferredPricingCurrency } from "@/lib/server/pricing-currency"
import { MarketingPageShell } from "@/features/policies/components/PolicySections"
import { resolvePublicPricingCatalog } from "@/features/pricing/lib/pricing-server"
import {
  PricingIntro,
  PricingPlanList,
  PricingComparison,
} from "@/features/pricing/components/PricingSections"

export async function PricingView() {
  const [authState, preferredCurrency, pendingCreatorCode] = await Promise.all([
    auth(),
    getPreferredPricingCurrency(),
    getPendingCreatorCodeSummary(),
  ])
  const catalog = await resolvePublicPricingCatalog(preferredCurrency)
  return (
    <MarketingPageShell>
      <div className="grid gap-8 md:gap-10 lg:gap-12">
        <PricingIntro
          availableCurrencies={catalog.availableCurrencies}
          pendingCreatorCode={pendingCreatorCode}
          selectedCurrency={catalog.selectedCurrency}
        />
        <PricingPlanList
          catalog={catalog}
          signedIn={Boolean(authState.userId)}
        />
        <PricingComparison catalog={catalog} />
      </div>
    </MarketingPageShell>
  )
}
