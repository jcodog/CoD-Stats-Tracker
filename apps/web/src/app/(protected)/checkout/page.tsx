import { CheckoutView } from "@/features/billing/views/CheckoutView"
import { billingIntervalSchema } from "@/features/billing/lib/billing-schemas"
import { createPageMetadata } from "@/lib/metadata/page"
import { isFlagEnabled } from "@/lib/flags"
import { normalizeCreatorCode } from "@/lib/creator-attribution-cookie"
import { normalizePricingCurrency } from "@/lib/pricing-currency"
import { getPreferredPricingCurrency } from "@/lib/server/pricing-currency"
import { resolveRequestViewport } from "@/lib/server/request-viewport"
import { redirect } from "next/navigation"

export const metadata = createPageMetadata("Checkout")

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    creator?: string | string[]
    currency?: string | string[]
    interval?: string | string[]
    plan?: string | string[]
  }>
}) {
  const resolvedSearchParams = await searchParams
  const requestedPlan =
    typeof resolvedSearchParams.plan === "string"
      ? resolvedSearchParams.plan.trim()
      : ""
  const requestedIntervalValue =
    typeof resolvedSearchParams.interval === "string"
      ? resolvedSearchParams.interval
      : ""
  const requestedInterval =
    billingIntervalSchema.safeParse(requestedIntervalValue).data ?? null
  const initialCreatorCode =
    typeof resolvedSearchParams.creator === "string"
      ? normalizeCreatorCode(resolvedSearchParams.creator)
      : null

  if (!requestedPlan || !requestedInterval) {
    redirect("/settings/billing/plan")
  }

  const [checkoutEnabled, defaultPreferredCurrency, viewport] = await Promise.all([
    isFlagEnabled("checkout"),
    getPreferredPricingCurrency(),
    resolveRequestViewport(),
  ])
  const preferredCurrency =
    (typeof resolvedSearchParams.currency === "string"
      ? normalizePricingCurrency(resolvedSearchParams.currency)
      : null) ?? defaultPreferredCurrency

  return (
    <CheckoutView
      checkoutEnabled={checkoutEnabled}
      initialInterval={requestedInterval}
      initialCreatorCode={initialCreatorCode}
      initialPlanKey={requestedPlan}
      preferredCurrency={preferredCurrency}
      viewport={viewport}
    />
  )
}
