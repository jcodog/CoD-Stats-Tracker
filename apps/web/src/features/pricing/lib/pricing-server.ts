import "server-only"

import { fetchQuery } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"

import type { PricingCatalogResponse } from "@/features/billing/lib/billing-types"

export async function resolvePublicPricingCatalog() {
  return (await fetchQuery(
    api.queries.billing.catalog.getPublicPricingCatalog,
    {}
  )) as PricingCatalogResponse
}
