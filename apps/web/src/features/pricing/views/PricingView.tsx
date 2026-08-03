import { auth } from "@clerk/nextjs/server"

import { resolveRequestViewport } from "@/lib/server/request-viewport"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"
import { getPreferredPricingCurrency } from "@/lib/server/pricing-currency"
import { MarketingPageShell } from "@/features/policies/components/PolicySections"
import { resolvePublicPricingCatalog } from "@/features/pricing/lib/pricing-server"
import { PricingDesktopView } from "@/features/pricing/views/PricingDesktopView"
import { PricingMobileView } from "@/features/pricing/views/PricingMobileView"

export async function PricingView() {
  const [authState, preferredCurrency, pendingCreatorCode, viewport] =
    await Promise.all([
      auth(),
      getPreferredPricingCurrency(),
      getPendingCreatorCodeSummary(),
      resolveRequestViewport(),
    ])
  const catalog = await resolvePublicPricingCatalog(preferredCurrency)
  const signedIn = Boolean(authState.userId)

  return (
    <MarketingPageShell viewport={viewport}>
      {viewport === "mobile" ? (
        <PricingMobileView
          catalog={catalog}
          signedIn={signedIn}
          pendingCreatorCode={pendingCreatorCode}
        />
      ) : (
        <PricingDesktopView
          catalog={catalog}
          signedIn={signedIn}
          pendingCreatorCode={pendingCreatorCode}
        />
      )}
    </MarketingPageShell>
  )
}
