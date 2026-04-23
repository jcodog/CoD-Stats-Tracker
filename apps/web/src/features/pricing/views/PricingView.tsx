import { resolveRequestViewport } from "@/lib/server/request-viewport"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"
import { getPreferredPricingCurrency } from "@/lib/server/pricing-currency"
import { MarketingPageShell } from "@/features/policies/components/PolicySections"
import { resolvePublicPricingCatalog } from "@/features/pricing/lib/pricing-server"
import { PricingDesktopView } from "@/features/pricing/views/PricingDesktopView"
import { PricingMobileView } from "@/features/pricing/views/PricingMobileView"

export async function PricingView() {
  const [preferredCurrency, pendingCreatorCode, viewport] = await Promise.all([
    getPreferredPricingCurrency(),
    getPendingCreatorCodeSummary(),
    resolveRequestViewport(),
  ])
  const catalog = await resolvePublicPricingCatalog(preferredCurrency)

  return (
    <MarketingPageShell viewport={viewport}>
      {viewport === "mobile" ? (
        <PricingMobileView
          catalog={catalog}
          pendingCreatorCode={pendingCreatorCode}
        />
      ) : (
        <PricingDesktopView
          catalog={catalog}
          pendingCreatorCode={pendingCreatorCode}
        />
      )}
    </MarketingPageShell>
  )
}
