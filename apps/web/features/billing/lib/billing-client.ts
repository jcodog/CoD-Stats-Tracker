"use client"

import { useConvex, useConvexAuth } from "convex/react"
import type { ConvexReactClient } from "convex/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@workspace/backend/convex/_generated/api"

import type {
  BillingChangePreview,
  BillingChangeResult,
  BillingResolvedState,
  CancellationResult,
  CheckoutIntentResult,
  InvoiceHistoryEntry,
  PricingCatalogResponse,
  ReactivationResult,
} from "@/features/billing/lib/billing-types"
import { billingQueryKeys } from "@/features/billing/lib/billing-query-keys"
import type {
  CreateSubscriptionIntentInput,
  SubscriptionChangeInput,
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

async function callBillingRoute<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-codstats-csrf": "1",
      ...(init?.headers ?? {}),
    },
  })

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; ok?: boolean; result?: T }
    | null

  if (!response.ok || !payload?.ok) {
    throw new BillingClientError(
      payload?.message ?? "Billing request failed.",
      response.status,
      payload
    )
  }

  return payload.result as T
}

async function queryPricingCatalog(convex: ConvexReactClient) {
  try {
    return (await convex.query(
      api.queries.billing.catalog.getCustomerPricingCatalog,
      {}
    )) as PricingCatalogResponse
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

export function usePricingCatalog() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryPricingCatalog(convex),
    queryKey: billingQueryKeys.catalog,
  })
}

export function useBillingState() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryBillingState(convex),
    queryKey: billingQueryKeys.state,
  })
}

export function useInvoiceHistory(args?: { enabled?: boolean }) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: (args?.enabled ?? true) && !isLoading && isAuthenticated,
    queryFn: () =>
      callBillingRoute<InvoiceHistoryEntry[]>("/api/billing/invoices", {
        headers: {},
        method: "GET",
      }),
    queryKey: billingQueryKeys.invoices,
  })
}

export function useInvalidateBillingQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.catalog }),
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.state }),
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoices }),
      ])
    },
  }
}

export function useCreateSubscriptionIntent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSubscriptionIntentInput) =>
      callBillingRoute<CheckoutIntentResult>("/api/billing/checkout/intent", {
        body: JSON.stringify(input),
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.state })
    },
  })
}

export function usePreviewSubscriptionChange() {
  return useMutation({
    mutationFn: (input: SubscriptionChangeInput) =>
      callBillingRoute<BillingChangePreview>("/api/billing/subscription/preview", {
        body: JSON.stringify(input),
        method: "POST",
      }),
  })
}

export function useUpdateSubscriptionPlan() {
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: SubscriptionChangeInput) =>
      callBillingRoute<BillingChangeResult>("/api/billing/subscription/change", {
        body: JSON.stringify(input),
        method: "POST",
      }),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useCancelSubscription() {
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: () =>
      callBillingRoute<CancellationResult>("/api/billing/subscription/cancel", {
        body: JSON.stringify({}),
        method: "POST",
      }),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useReactivateSubscription() {
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: () =>
      callBillingRoute<ReactivationResult>(
        "/api/billing/subscription/reactivate",
        {
          body: JSON.stringify({}),
          method: "POST",
        }
      ),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}
