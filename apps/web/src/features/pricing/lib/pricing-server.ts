import "server-only"

import { fetchQuery } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"

import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import type { SupportedPricingCurrency } from "@/lib/pricing-currency"

export async function resolvePublicPricingCatalog(
  preferredCurrency?: SupportedPricingCurrency
) {
  return (await fetchQuery(
    api.queries.billing.catalog.getPublicPricingCatalog,
    preferredCurrency ? { preferredCurrency } : {}
  )) as PricingCatalogResponse
}
