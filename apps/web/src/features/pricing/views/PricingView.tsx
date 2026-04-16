import { resolveRequestViewport } from "@/lib/server/request-viewport"
import { MarketingPageShell } from "@/features/policies/components/PolicySections"
import { resolvePublicPricingCatalog } from "@/features/pricing/lib/pricing-server"
import { PricingDesktopView } from "@/features/pricing/views/PricingDesktopView"
import { PricingMobileView } from "@/features/pricing/views/PricingMobileView"

export async function PricingView() {
  const [catalog, viewport] = await Promise.all([
    resolvePublicPricingCatalog(),
    resolveRequestViewport(),
  ])

  return (
    <MarketingPageShell viewport={viewport}>
      {viewport === "mobile" ? (
        <PricingMobileView catalog={catalog} />
      ) : (
        <PricingDesktopView catalog={catalog} />
      )}
    </MarketingPageShell>
  )
}
