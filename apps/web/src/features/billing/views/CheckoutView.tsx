"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  CheckoutElementsProvider,
  CurrencySelectorElement,
  PaymentElement,
  useCheckout,
} from "@stripe/react-stripe-js/checkout"
import {
  IconArrowRight,
  IconCreditCard,
  IconLink,
  IconTicket,
} from "@tabler/icons-react"
import { useTheme } from "next-themes"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

import {
  BillingClientError,
  useBillingState,
  useCheckoutQuote,
  useCreateSubscriptionCheckoutSession,
  usePricingCatalog,
} from "@/features/billing/lib/billing-client"
import {
  getStripeElementsAppearance,
  getStripePublishableKey,
  stripePromise,
} from "@/features/billing/lib/stripe"
import type {
  BillingInterval,
  CheckoutQuoteResult,
  CheckoutSessionResult,
  PricingCatalogPlan,
  SupportedPricingCurrency,
} from "@/features/billing/lib/billing-types"
import type { RequestViewport } from "@/lib/server/request-viewport"

function getSelectedPlan(
  plans: PricingCatalogPlan[],
  initialPlanKey: string
): PricingCatalogPlan | null {
  return plans.find((plan) => plan.planKey === initialPlanKey) ?? null
}

function hasActivePaidSubscription(args: {
  accessSource: string | null | undefined
  status:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "paused"
    | "trialing"
    | "unpaid"
    | null
    | undefined
}) {
  return (
    args.accessSource === "paid_subscription" &&
    (args.status === "active" ||
      args.status === "trialing" ||
      args.status === "past_due" ||
      args.status === "paused")
  )
}

function getCreatorGrantCheckoutMessage(args: {
  creatorGrantEndsAt?: number
  managedGrantEndsAt?: number
}) {
  const endsAt = args.managedGrantEndsAt ?? args.creatorGrantEndsAt

  return endsAt
    ? `This account already has Creator complimentary access until ${new Intl.DateTimeFormat(
        undefined,
        {
          dateStyle: "medium",
        }
      ).format(endsAt)}.`
    : "This account already has Creator complimentary access with no expiry."
}

function CheckoutSessionLoadingState() {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(22rem,1.08fr)]">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

function CheckoutElementsContent({
  creatorCode,
  creatorDiscount,
  planName,
}: {
  creatorCode?: string | null
  creatorDiscount: CheckoutQuoteResult["creatorDiscount"] | undefined
  planName: string
}) {
  const router = useRouter()
  const checkoutState = useCheckout()
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    if (checkoutState.type !== "success") {
      return
    }

    setConfirmError(null)
    setIsSubmitting(true)

    try {
      const result = await checkoutState.checkout.confirm({
        redirect: "if_required",
        returnUrl: new URL(
          "/checkout/complete?session_id={CHECKOUT_SESSION_ID}",
          window.location.origin
        ).toString(),
      })

      if (result.type === "error") {
        setConfirmError(result.error.message)
        return
      }

      router.replace(
        `/checkout/complete?session_id=${encodeURIComponent(result.session.id)}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (checkoutState.type === "loading") {
    return <CheckoutSessionLoadingState />
  }

  if (checkoutState.type === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Checkout failed to load</AlertTitle>
        <AlertDescription>{checkoutState.error.message}</AlertDescription>
      </Alert>
    )
  }

  const checkout = checkoutState.checkout
  const primaryLineItem = checkout.lineItems[0] ?? null
  const localizedTotal = checkout.total.total.amount
  const localizedSubtotal = checkout.total.subtotal.amount
  const localizedDiscount = checkout.total.discount.amount
  const localizedRenewal = checkout.recurring?.dueNext.total.amount ?? null
  const currencyOptionsCount = checkout.currencyOptions?.length ?? 0

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(22rem,1.08fr)]">
      <section className="border-y border-border/70 py-5">
        <div className="grid gap-5">
          <div className="flex flex-col gap-2">
            <div className="text-lg font-semibold tracking-tight">
              Order summary
            </div>
            <p className="text-sm text-muted-foreground">
              Localized totals come from the live Stripe Checkout Session, not a
              local price mirror.
            </p>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium text-foreground">
                {primaryLineItem?.name || planName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
                {localizedSubtotal}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-foreground">
                {localizedDiscount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">Due today</span>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                {localizedTotal}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Renews</span>
              <span className="font-medium text-foreground">
                {localizedRenewal ?? "Stripe will confirm after payment"}
              </span>
            </div>
          </div>

          {currencyOptionsCount > 1 ? (
            <p className="text-sm text-muted-foreground">
              Stripe currently offers {currencyOptionsCount} presentment
              currencies for this session.
            </p>
          ) : null}

          {creatorDiscount ? (
            <div className="grid gap-1 text-sm">
              <div className="font-medium text-foreground">Creator discount</div>
              <div className="text-muted-foreground">
                {creatorDiscount.message}
              </div>
              {creatorCode ? (
                <div className="text-muted-foreground">
                  Applied code:{" "}
                  <span className="font-medium text-foreground">
                    {creatorCode}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-y border-border/70 py-5">
        <div className="grid gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-2">
              <div className="text-lg font-semibold tracking-tight">
                Payment
              </div>
              <p className="text-sm text-muted-foreground">
                Stripe will localize currency when the session is eligible, and
                the selector below controls presentment on this checkout.
              </p>
            </div>
            {currencyOptionsCount > 1 ? (
              <div className="min-w-[11rem]">
                <CurrencySelectorElement />
              </div>
            ) : null}
          </div>

          <PaymentElement
            options={{
              layout: {
                defaultCollapsed: false,
                radios: "always",
                spacedAccordionItems: false,
                type: "accordion",
              },
            }}
          />

          {confirmError ? (
            <Alert variant="destructive">
              <AlertTitle>Payment failed</AlertTitle>
              <AlertDescription>{confirmError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            className="w-full"
            disabled={isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? "Confirming..." : "Complete subscription"}
            {!isSubmitting ? <IconCreditCard data-icon="inline-end" /> : null}
          </Button>
        </div>
      </section>
    </div>
  )
}

export function CheckoutView({
  checkoutEnabled,
  initialInterval,
  initialPlanKey,
  preferredCurrency,
  viewport = "desktop",
}: {
  checkoutEnabled: boolean
  initialInterval: BillingInterval
  initialPlanKey: string
  preferredCurrency: SupportedPricingCurrency
  viewport?: RequestViewport
}) {
  const isMobileView = viewport === "mobile"
  const { resolvedTheme } = useTheme()
  const catalogQuery = usePricingCatalog(preferredCurrency)
  const billingStateQuery = useBillingState()
  const createCheckoutSession = useCreateSubscriptionCheckoutSession()
  const [creatorCodeInput, setCreatorCodeInput] = useState("")
  const [submittedCreatorCode, setSubmittedCreatorCode] = useState<
    string | undefined
  >(undefined)
  const [sessionNonce, setSessionNonce] = useState(0)
  const [checkoutSession, setCheckoutSession] =
    useState<CheckoutSessionResult | null>(null)
  const [checkoutSessionError, setCheckoutSessionError] = useState<
    string | null
  >(null)
  const sessionRequestIdRef = useRef(0)

  const paidPlans =
    catalogQuery.data?.plans.filter(
      (plan) => plan.planType === "paid" && plan.active
    ) ?? []
  const selectedPlan = getSelectedPlan(paidPlans, initialPlanKey)
  const checkoutQuoteQuery = useCheckoutQuote(
    selectedPlan
      ? {
          creatorCode: submittedCreatorCode,
          interval: initialInterval,
          planKey: selectedPlan.planKey,
          preferredCurrency,
        }
      : null
  )
  const billingState = billingStateQuery.data
  const hasCreatorGrantAccess =
    (billingState?.accessSource === "creator_grant" ||
      billingState?.accessSource === "managed_grant_subscription") &&
    billingState.hasCreatorAccess
  const hasPaidAccess = hasActivePaidSubscription({
    accessSource: billingState?.accessSource,
    status: billingState?.subscription?.status,
  })

  useEffect(() => {
    if (
      !checkoutEnabled ||
      !selectedPlan ||
      !getStripePublishableKey() ||
      hasCreatorGrantAccess ||
      hasPaidAccess
    ) {
      return
    }

    const requestId = sessionRequestIdRef.current + 1
    sessionRequestIdRef.current = requestId
    setCheckoutSession(null)
    setCheckoutSessionError(null)

    createCheckoutSession
      .mutateAsync({
        creatorCode: submittedCreatorCode,
        interval: initialInterval,
        planKey: selectedPlan.planKey,
        preferredCurrency,
      })
      .then((result) => {
        if (sessionRequestIdRef.current !== requestId) {
          return
        }

        setCheckoutSession(result)
      })
      .catch((error) => {
        if (sessionRequestIdRef.current !== requestId) {
          return
        }

        setCheckoutSessionError(
          error instanceof BillingClientError
            ? error.message
            : "Unable to start Stripe Checkout."
        )
      })
  }, [
    checkoutEnabled,
    createCheckoutSession,
    hasCreatorGrantAccess,
    hasPaidAccess,
    initialInterval,
    preferredCurrency,
    selectedPlan,
    sessionNonce,
    submittedCreatorCode,
  ])

  function handleApplyCreatorCode() {
    const nextCreatorCode =
      creatorCodeInput.trim().toUpperCase() || undefined
    setSubmittedCreatorCode(nextCreatorCode)
    setSessionNonce((value) => value + 1)
  }

  function handleClearCreatorCode() {
    setCreatorCodeInput("")
    setSubmittedCreatorCode(undefined)
    setSessionNonce((value) => value + 1)
  }

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code)
    toast.success("Creator code copied.")
  }

  if (!checkoutEnabled) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <div className="w-full border border-border/70 bg-background px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Checkout unavailable
            </h1>
            <p className="text-sm text-muted-foreground">
              Billing rollout is currently disabled for this account.
            </p>
          </div>
          <div className="mt-5">
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (catalogQuery.isPending || billingStateQuery.isPending) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-18 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <CheckoutSessionLoadingState />
      </div>
    )
  }

  if (catalogQuery.isError || billingStateQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Billing failed to load</AlertTitle>
        <AlertDescription>
          Refresh the page or open billing settings again.
        </AlertDescription>
      </Alert>
    )
  }

  if (hasCreatorGrantAccess) {
    return (
      <div className="grid gap-6">
        <div className="border border-border/70 bg-background px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Creator access is already active
            </h1>
            <p className="text-sm text-muted-foreground">
              {getCreatorGrantCheckoutMessage({
                creatorGrantEndsAt: billingState?.creatorGrant?.endsAt,
                managedGrantEndsAt: billingState?.subscription?.managedGrantEndsAt,
              })}{" "}
              Billing checkout is unavailable while that grant remains active.
            </p>
          </div>
          <div className="mt-5">
            <Button asChild>
              <Link href="/settings/billing">Open billing</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (hasPaidAccess) {
    return (
      <div className="grid gap-6">
        <div className="border border-border/70 bg-background px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Billing is already active
            </h1>
            <p className="text-sm text-muted-foreground">
              This account already has a live paid subscription. Open billing to
              change plans or manage cancellation instead of starting a new
              checkout.
            </p>
          </div>
          <div className="mt-5">
            <Button asChild>
              <Link href="/settings/billing">Open billing</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedPlan) {
    return (
      <Alert>
        <AlertTitle>No purchasable plans</AlertTitle>
        <AlertDescription>
          The billing catalog does not currently expose any active paid plans.
        </AlertDescription>
      </Alert>
    )
  }

  if (!getStripePublishableKey() || !stripePromise) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Stripe is not configured</AlertTitle>
        <AlertDescription>
          Missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
        </AlertDescription>
      </Alert>
    )
  }

  const creatorDiscount = checkoutQuoteQuery.data?.creatorDiscount
  const creatorState = creatorDiscount?.entryState ?? "eligible_but_not_entered"

  return (
    <div className={isMobileView ? "grid gap-6" : "grid gap-8"}>
      <section className="grid gap-3 border-b border-border/70 pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3">
            <h1
              className={
                isMobileView
                  ? "text-3xl font-semibold tracking-tight"
                  : "text-4xl font-semibold tracking-tight"
              }
            >
              Checkout
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              This page only completes payment for the plan you already chose.
              Pricing, currency localization, and creator discounts are all
              resolved by Stripe on the live Checkout Session.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/billing/plan">Change plan</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/billing">
                Open billing
                <IconArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 border-y border-border/70 py-5">
        <div className="grid gap-1">
          <div className="text-lg font-semibold tracking-tight text-foreground">
            Selected plan
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedPlan.name} / {initialInterval}
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="creator-code">Creator code</FieldLabel>
            <Input
              id="creator-code"
              onChange={(event) => setCreatorCodeInput(event.target.value)}
              placeholder="Optional creator code"
              value={creatorCodeInput}
            />
            <FieldDescription>
              Attribution and first-payment creator discount rules stay
              server-trusted.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={createCheckoutSession.isPending}
            onClick={handleApplyCreatorCode}
            size="sm"
            variant="outline"
          >
            <IconTicket data-icon="inline-start" />
            {submittedCreatorCode ? "Reapply code" : "Apply code"}
          </Button>
          {submittedCreatorCode ? (
            <>
              <Button onClick={() => handleCopyCode(submittedCreatorCode)} size="sm">
                <IconLink data-icon="inline-start" />
                Copy code
              </Button>
              <Button onClick={handleClearCreatorCode} size="sm" variant="ghost">
                Remove code
              </Button>
            </>
          ) : null}
        </div>

        {checkoutQuoteQuery.isPending ? (
          <p className="text-sm text-muted-foreground">
            Refreshing creator discount preview...
          </p>
        ) : creatorDiscount ? (
          <p className="text-sm text-muted-foreground">
            {creatorDiscount.message}
          </p>
        ) : null}

        {creatorState === "applied" && submittedCreatorCode ? (
          <p className="text-sm text-foreground">
            Applied creator code{" "}
            <span className="font-medium">{submittedCreatorCode}</span>.
          </p>
        ) : null}
      </section>

      {checkoutSessionError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to start checkout</AlertTitle>
          <AlertDescription>{checkoutSessionError}</AlertDescription>
        </Alert>
      ) : null}

      {checkoutSession ? (
        <CheckoutElementsProvider
          options={{
            adaptivePricing: {
              allowed: true,
            },
            clientSecret: checkoutSession.clientSecret,
            elementsOptions: {
              appearance: getStripeElementsAppearance(resolvedTheme),
              loader: "auto",
            },
          }}
          stripe={stripePromise}
        >
          <CheckoutElementsContent
            creatorCode={checkoutSession.creatorCode}
            creatorDiscount={creatorDiscount}
            planName={selectedPlan.name}
          />
        </CheckoutElementsProvider>
      ) : (
        <CheckoutSessionLoadingState />
      )}
    </div>
  )
}
