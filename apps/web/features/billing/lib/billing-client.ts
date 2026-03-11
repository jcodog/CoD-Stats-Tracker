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
import {
  createSubscriptionIntentSchema,
  subscriptionChangeSchema,
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

async function callCreateSubscriptionIntent(
  convex: ConvexReactClient,
  input: CreateSubscriptionIntentInput
) {
  const payload = createSubscriptionIntentSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.createSubscriptionIntent,
      payload
    )) as CheckoutIntentResult
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

async function callPreviewSubscriptionChange(
  convex: ConvexReactClient,
  input: SubscriptionChangeInput
) {
  const payload = subscriptionChangeSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.previewSubscriptionChange,
      payload
    )) as BillingChangePreview
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callChangeSubscription(
  convex: ConvexReactClient,
  input: SubscriptionChangeInput
) {
  const payload = subscriptionChangeSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.changeSubscriptionPlan,
      payload
    )) as BillingChangeResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callCancelSubscription(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.cancelCurrentSubscription,
      {}
    )) as CancellationResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callReactivateSubscription(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.reactivateCurrentSubscription,
      {}
    )) as ReactivationResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callInvoiceHistory(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.listInvoices,
      {}
    )) as InvoiceHistoryEntry[]
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
    staleTime: 30_000,
  })
}

export function useBillingState() {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: !isLoading && isAuthenticated,
    queryFn: () => queryBillingState(convex),
    queryKey: billingQueryKeys.state,
    staleTime: 15_000,
  })
}

export function useInvoiceHistory(args?: { enabled?: boolean }) {
  const convex = useConvex()
  const { isAuthenticated, isLoading } = useConvexAuth()

  return useQuery({
    enabled: (args?.enabled ?? true) && !isLoading && isAuthenticated,
    queryFn: () => callInvoiceHistory(convex),
    queryKey: billingQueryKeys.invoices,
    staleTime: 60_000,
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
  const convex = useConvex()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSubscriptionIntentInput) =>
      callCreateSubscriptionIntent(convex, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKeys.state })
    },
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

export function usePreviewSubscriptionChange() {
  const convex = useConvex()

  return useMutation({
    mutationFn: (input: SubscriptionChangeInput) =>
      callPreviewSubscriptionChange(convex, input),
  })
}

export function useUpdateSubscriptionPlan() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: SubscriptionChangeInput) =>
      callChangeSubscription(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useCancelSubscription() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: () => callCancelSubscription(convex),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useReactivateSubscription() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: () => callReactivateSubscription(convex),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}
