import { CheckoutView } from "@/features/billing/views/CheckoutView"
import { createPageMetadata } from "@/lib/metadata/page"
import { isFlagEnabled } from "@/lib/flags"
import { getPreferredPricingCurrency } from "@/lib/server/pricing-currency"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export const metadata = createPageMetadata("Checkout")

export default async function CheckoutPage() {
  const [checkoutEnabled, preferredCurrency, viewport] = await Promise.all([
    isFlagEnabled("checkout"),
    getPreferredPricingCurrency(),
    resolveRequestViewport(),
  ])

  return (
    <CheckoutView
      checkoutEnabled={checkoutEnabled}
      preferredCurrency={preferredCurrency}
      viewport={viewport}
    />
  )
}
