import "server-only"

import { fetchAction } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"

import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import type { SupportedPricingCurrency } from "@/lib/pricing-currency"

export async function resolvePublicPricingCatalog(
  preferredCurrency?: SupportedPricingCurrency
) {
  return (await fetchAction(
    api.actions.billing.customer.getPublicPricingCatalog,
    preferredCurrency ? { preferredCurrency } : {}
  )) as PricingCatalogResponse
}
