"use client"

import { useConvex, useConvexAuth } from "convex/react"
import type { ConvexReactClient } from "convex/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@workspace/backend/convex/_generated/api"

import type {
  BillingCenterData,
  BillingCenterSyncResult,
  BillingChangePreview,
  BillingChangeResult,
  BillingProfileUpdateResult,
  BillingResolvedState,
  CancellationResult,
  CheckoutIntentResult,
  CheckoutSessionResult,
  CheckoutQuoteResult,
  PaymentMethodMutationResult,
  PaymentMethodSetupIntentResult,
  PricingCatalogResponse,
  ReactivationResult,
} from "@/features/billing/lib/billing-types"
import { billingQueryKeys } from "@/features/billing/lib/billing-query-keys"
import type {
  CancelSubscriptionInput,
  CreateSubscriptionCheckoutSessionInput,
  CreateSubscriptionIntentInput,
  PaymentMethodActionInput,
  PreviewCheckoutQuoteInput,
  SubscriptionChangeInput,
  SubscriptionTargetInput,
  UpdateBillingProfileInput,
} from "@/features/billing/lib/billing-schemas"
import {
  cancelSubscriptionSchema,
  createSubscriptionCheckoutSessionSchema,
  createSubscriptionIntentSchema,
  paymentMethodActionSchema,
  previewCheckoutQuoteSchema,
  subscriptionChangeSchema,
  subscriptionTargetSchema,
  updateBillingProfileSchema,
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
  preferredCurrency?: string
) {
  try {
    return (await convex.query(
      api.queries.billing.catalog.getCustomerPricingCatalog,
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

async function callCancelSubscription(
  convex: ConvexReactClient,
  input: CancelSubscriptionInput
) {
  const payload = cancelSubscriptionSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.cancelCurrentSubscription,
      payload
    )) as CancellationResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callReactivateSubscription(
  convex: ConvexReactClient,
  input: SubscriptionTargetInput
) {
  const payload = subscriptionTargetSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.reactivateCurrentSubscription,
      payload
    )) as ReactivationResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callUpdateBillingProfile(
  convex: ConvexReactClient,
  input: UpdateBillingProfileInput
) {
  const payload = updateBillingProfileSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.updateBillingProfile,
      payload
    )) as BillingProfileUpdateResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callCreatePaymentMethodSetupIntent(convex: ConvexReactClient) {
  try {
    return (await convex.action(
      api.actions.billing.customer.createPaymentMethodSetupIntent,
      {}
    )) as PaymentMethodSetupIntentResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callSetDefaultPaymentMethod(
  convex: ConvexReactClient,
  input: PaymentMethodActionInput
) {
  const payload = paymentMethodActionSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.setDefaultPaymentMethod,
      payload
    )) as PaymentMethodMutationResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

async function callRemovePaymentMethod(
  convex: ConvexReactClient,
  input: PaymentMethodActionInput
) {
  const payload = paymentMethodActionSchema.parse(input)

  try {
    return (await convex.action(
      api.actions.billing.customer.removePaymentMethod,
      payload
    )) as PaymentMethodMutationResult
  } catch (error) {
    throw toBillingClientError(error)
  }
}

export function usePricingCatalog(preferredCurrency?: string) {
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

export function useCreateSubscriptionIntent() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: CreateSubscriptionIntentInput) =>
      callCreateSubscriptionIntent(convex, input),
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
    mutationFn: (input: CancelSubscriptionInput) =>
      callCancelSubscription(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useReactivateSubscription() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: SubscriptionTargetInput) =>
      callReactivateSubscription(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useUpdateBillingProfile() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: UpdateBillingProfileInput) =>
      callUpdateBillingProfile(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useCreatePaymentMethodSetupIntent() {
  const convex = useConvex()

  return useMutation({
    mutationFn: () => callCreatePaymentMethodSetupIntent(convex),
  })
}

export function useSetDefaultPaymentMethod() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: PaymentMethodActionInput) =>
      callSetDefaultPaymentMethod(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}

export function useRemovePaymentMethod() {
  const convex = useConvex()
  const invalidateBilling = useInvalidateBillingQueries()

  return useMutation({
    mutationFn: (input: PaymentMethodActionInput) =>
      callRemovePaymentMethod(convex, input),
    onSuccess: async () => {
      await invalidateBilling.invalidateAll()
    },
  })
}
