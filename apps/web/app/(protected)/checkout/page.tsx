import { CheckoutView } from "@/features/billing/views/CheckoutView"
import { isFlagEnabled } from "@/lib/flags"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export default async function CheckoutPage() {
  const [checkoutEnabled, viewport] = await Promise.all([
    isFlagEnabled("checkout"),
    resolveRequestViewport(),
  ])

  return <CheckoutView checkoutEnabled={checkoutEnabled} viewport={viewport} />
}
