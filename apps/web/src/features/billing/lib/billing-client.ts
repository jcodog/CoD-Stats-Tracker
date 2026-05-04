"use client"

import { useConvex, useConvexAuth } from "convex/react"
import type { ConvexReactClient } from "convex/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@workspace/backend/convex/_generated/api"

import type {
  BillingCenterData,
  BillingCenterSyncResult,
  BillingPortalSessionResult,
  BillingResolvedState,
  CheckoutSessionResult,
  CheckoutQuoteResult,
  PricingCatalogResponse,
  SupportedPricingCurrency,
} from "@/features/billing/lib/billing-types"
import { billingQueryKeys } from "@/features/billing/lib/billing-query-keys"
import type {
  CreateSubscriptionCheckoutSessionInput,
  PreviewCheckoutQuoteInput,
} from "@/features/billing/lib/billing-schemas"
import {
  createSubscriptionCheckoutSessionSchema,
  previewCheckoutQuoteSchema,
} from "@/features/billing/lib/billing-schemas"

export class BillingClientError extends Error {
  data: unknown
  status: number

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.data = data
    this.status = status
  }
}

function toBillingClientError(error: unknown) {
  if (error instanceof BillingClientError) {
    return error
  }

  const message =
    error instanceof Error ? error.message : "Billing request failed."
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500

  return new BillingClientError(message, status, error)
}

const BILLING_CATALOG_STALE_TIME = 10 * 60_000
const BILLING_STATE_STALE_TIME = 2 * 60_000
const BILLING_CENTER_STALE_TIME = 2 * 60_000

async function queryPricingCatalog(
  convex: ConvexReactClient,
  preferredCurrency?: SupportedPricingCurrency
) {
  try {
    return (await convex.action(
      api.actions.billing.customer.getCustomerPricingCatalog,
      preferredCurrency ? { preferredCurrency } : {}
    )) as PricingCatalogResponse
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function queryCheckoutQuote(
  convex: ConvexReactClient,
  input: PreviewCheckoutQuoteInput
) {
  const payload = previewCheckoutQuoteSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.previewCheckoutQuote,
      payload
    )) as CheckoutQuoteResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function queryBillingState(convex: ConvexReactClient) {
  try {
    return (await convex.query(
      api.queries.billing.state.getCurrentUserBillingState,
      {}
    )) as BillingResolvedState | null
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function queryBillingCenter(convex: ConvexReactClient) {
  try {
    return (await convex.query(
      api.queries.billing.center.getCurrentUserBillingCenter,
      {}
    )) as BillingCenterData | null
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callSyncBillingCenter(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.syncBillingCenter,
      {}
    )) as BillingCenterSyncResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callCreateSubscriptionCheckoutSession(
  convex: ConvexReactClient,
  input: CreateSubscriptionCheckoutSessionInput
) {
  const payload = createSubscriptionCheckoutSessionSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.createSubscriptionCheckoutSession,
      payload
    )) as CheckoutSessionResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callCreateBillingPortalSession(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.createBillingPortalSession,
      {}
    )) as BillingPortalSessionResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callAbandonPendingCheckout(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.abandonPendingCheckout,
      {}
    )) as {
      abandoned: boolean
      invoiceWasCleared?: boolean
      status?: string
    }
  } catch (error) {
    throw toBillingClientError(error)
  }
}

export function usePricingCatalog(preferredCurrency?: SupportedPricingCurrency) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryPricingCatalog(convex, preferredCurrency),
    queryKey: billingQueryKeys.catalog(preferredCurrency),
    staleTime: BILLING_CATALOG_STALE_TIME,
  })
}

export function useCheckoutQuote(input: PreviewCheckoutQuoteInput | null) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated && input !== null,
    queryFn: () => queryCheckoutQuote(convex, input as PreviewCheckoutQuoteInput),
    queryKey:
      input === null
        ? ["billing", "checkoutQuote", "idle"]
        : billingQueryKeys.checkoutQuote(input),
  })
}

export function useBillingState() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryBillingState(convex),
    queryKey: billingQueryKeys.state,
    staleTime: BILLING_STATE_STALE_TIME,
  })
}

export function useBillingCenter() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryBillingCenter(convex),
    queryKey: billingQueryKeys.center,
    staleTime: BILLING_CENTER_STALE_TIME,
  })
}

export function useInvalidateBillingQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: billingQueryKeys.catalogRoot,
        }),
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.center }),
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.state }),
      ])
    },
  }
}

export function useSyncBillingCenter() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: () => callSyncBillingCenter(convex),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useCreateSubscriptionCheckoutSession() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: CreateSubscriptionCheckoutSessionInput) =>
      callCreateSubscriptionCheckoutSession(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useCreateBillingPortalSession() {
  const convex = useConvex()

  return useMutation({
    mutationFn: () => callCreateBillingPortalSession(convex),
  })
}

export function useAbandonPendingCheckout() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: () => callAbandonPendingCheckout(convex),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}
