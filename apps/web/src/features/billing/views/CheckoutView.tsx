"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Elements } from "@stripe/react-stripe-js"
import { IconArrowRight, IconCreditCard, IconTicket } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

import { CheckoutPaymentForm } from "@/features/billing/components/CheckoutPaymentForm"
import { PlanSelector } from "@/features/billing/components/PlanSelector"
import {
  BillingClientError,
  useAbandonPendingCheckout,
  useBillingCenter,
  useBillingState,
  useCheckoutQuote,
  useCreateSubscriptionIntent,
  usePricingCatalog,
} from "@/features/billing/lib/billing-client"
import { formatCurrencyAmount } from "@/features/billing/lib/format"
import {
  getStripeElementsAppearance,
  getStripePublishableKey,
  stripePromise,
} from "@/features/billing/lib/stripe"
import type {
  BillingInterval,
  BillingResolvedState,
  SupportedPricingCurrency,
} from "@/features/billing/lib/billing-types"
import type { RequestViewport } from "@/lib/server/request-viewport"

export function CheckoutView({
  checkoutEnabled,
  preferredCurrency,
  viewport = "desktop",
}: {
  checkoutEnabled: boolean
  preferredCurrency: SupportedPricingCurrency
  viewport?: RequestViewport
}) {
  const isMobileView = viewport === "mobile"
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const catalogQuery = usePricingCatalog(preferredCurrency)
  const billingCenterQuery = useBillingCenter()
  const billingStateQuery = useBillingState()
  const createSubscriptionIntent = useCreateSubscriptionIntent()
  const abandonPendingCheckout = useAbandonPendingCheckout()
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval | null>(null)
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null)
  const [creatorCodeInput, setCreatorCodeInput] = useState("")
  const [submittedCreatorCode, setSubmittedCreatorCode] = useState<
    string | undefined
  >(undefined)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState<{
    clientSecret?: string
    customerSessionClientSecret?: string
    defaultBillingEmail?: string
    secretType: "none" | "payment_intent" | "setup_intent"
  } | null>(null)

  const paidPlans =
    catalogQuery.data?.plans.filter(
      (plan) => plan.planType === "paid" && plan.active
    ) ?? []
  const effectiveSelectedInterval =
    selectedInterval ?? catalogQuery.data?.currentInterval ?? "month"
  const effectiveSelectedPlanKey =
    selectedPlanKey ??
    paidPlans[0]?.planKey ??
    catalogQuery.data?.plans[0]?.planKey ??
    ""
  const selectedPlan =
    paidPlans.find((plan) => plan.planKey === effectiveSelectedPlanKey) ??
    paidPlans[0] ??
    null
  const hasManagedSubscription =
    billingCenterQuery.data?.portalMode === "management"
  const hasCreatorGrantAccess =
    (billingStateQuery.data?.accessSource === "creator_grant" ||
      billingStateQuery.data?.accessSource === "managed_grant_subscription") &&
    billingStateQuery.data.hasCreatorAccess
  const checkoutQuoteQuery = useCheckoutQuote(
    selectedPlan
      ? {
          creatorCode: submittedCreatorCode,
          interval: effectiveSelectedInterval,
          planKey: selectedPlan.planKey,
          preferredCurrency,
        }
      : null
  )
  const checkoutQuote = checkoutQuoteQuery.data

  function getCreatorGrantCheckoutMessage(
    billingState: BillingResolvedState | null | undefined
  ) {
    if (!billingState || !billingState.hasCreatorAccess) {
      return "This account already has Creator complimentary access."
    }

    const endsAt =
      billingState.subscription?.managedGrantEndsAt ??
      billingState.creatorGrant?.endsAt

    return endsAt
      ? `This account already has Creator complimentary access until ${new Intl.DateTimeFormat(
          undefined,
          {
            dateStyle: "medium",
          }
        ).format(endsAt)}.`
      : "This account already has Creator complimentary access with no expiry."
  }

  async function clearPendingCheckoutIntent() {
    if (!checkoutResult?.clientSecret) {
      setCheckoutResult(null)
      return
    }

    try {
      await abandonPendingCheckout.mutateAsync()
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to clear the pending checkout attempt."
      )
    } finally {
      setCheckoutResult(null)
    }
  }

  async function handleCreateIntent() {
    if (!selectedPlan) {
      return
    }

    try {
      const result = await createSubscriptionIntent.mutateAsync({
        attemptKey: crypto.randomUUID(),
        creatorCode: submittedCreatorCode,
        interval: effectiveSelectedInterval,
        planKey: selectedPlan.planKey,
        preferredCurrency,
      })

      if (!result.requiresConfirmation || !result.clientSecret) {
        router.push("/checkout/complete")
        return
      }

      setCheckoutResult({
        clientSecret: result.clientSecret,
        customerSessionClientSecret: result.customerSessionClientSecret,
        defaultBillingEmail: result.defaultBillingEmail,
        secretType: result.secretType,
      })
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to start checkout."
      )
    }
  }

  if (!checkoutEnabled) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <div className="w-full rounded-xl border border-border/70 bg-card px-6 py-6">
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

  if (
    catalogQuery.isPending ||
    billingCenterQuery.isPending ||
    billingStateQuery.isPending
  ) {
    return (
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (
    catalogQuery.isError ||
    billingCenterQuery.isError ||
    billingStateQuery.isError
  ) {
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
        <div className="rounded-xl border border-border/70 bg-card px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Creator access is already active
            </h1>
            <p className="text-sm text-muted-foreground">
              {getCreatorGrantCheckoutMessage(billingStateQuery.data)} Billing
              checkout is unavailable while that grant remains active.
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

  if (hasManagedSubscription) {
    return (
      <div className="grid gap-6">
        <div className="rounded-xl border border-border/70 bg-card px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Checkout is only for new subscriptions
            </h1>
            <p className="text-sm text-muted-foreground">
              This account already has a managed Stripe subscription path. Open
              billing to change plans, update payment methods, or manage
              cancellation from inside the app.
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

  const creatorDiscount = checkoutQuote?.creatorDiscount
  const creatorState = creatorDiscount?.entryState ?? "eligible_but_not_entered"
  const canPreparePayment =
    Boolean(getStripePublishableKey()) &&
    !createSubscriptionIntent.isPending &&
    !checkoutQuoteQuery.isPending &&
    Boolean(checkoutQuote)

  return (
    <div className={isMobileView ? "grid gap-6" : "grid gap-8"}>
      <div className="flex flex-col gap-3">
        <h1
          className={
            isMobileView
              ? "text-3xl font-semibold tracking-tight"
              : "text-4xl font-semibold tracking-tight"
          }
        >
          Secure checkout
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Choose a plan, confirm any creator discount, and complete payment
          directly inside the app with Stripe Payment Element and Link where
          available.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          <section className="rounded-xl border border-border/70 bg-card px-6 py-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Choose your plan
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick the billing interval first, then confirm the plan for this
                  account.
                </p>
              </div>
              <PlanSelector
                interval={effectiveSelectedInterval}
                onIntervalChange={(interval) => {
                  setSelectedInterval(interval)
                  void clearPendingCheckoutIntent()
                }}
                onSelectPlan={(planKey) => {
                  setSelectedPlanKey(planKey)
                  void clearPendingCheckoutIntent()
                }}
                plans={paidPlans}
                selectedPlanKey={selectedPlan.planKey}
                variant="checkout"
              />
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card px-6 py-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <IconTicket />
                  <h2 className="text-xl font-semibold tracking-tight">
                    Creator discount
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Creator discounts apply to the first payment only. If the
                  account is already linked, checkout keeps that attribution in
                  place.
                </p>
              </div>

              {checkoutQuoteQuery.isPending ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
                </div>
              ) : null}

              {checkoutQuoteQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Creator discount unavailable</AlertTitle>
                  <AlertDescription>
                    Refresh the page and try the code again.
                  </AlertDescription>
                </Alert>
              ) : null}

              {!checkoutQuoteQuery.isPending && creatorDiscount ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {creatorDiscount.appliedCode ? (
                            <Badge variant="secondary">
                              {creatorDiscount.appliedCode}
                            </Badge>
                          ) : null}
                          {creatorDiscount.sourceLabel ? (
                            <Badge variant="outline">
                              {creatorDiscount.sourceLabel}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {creatorDiscount.message}
                        </p>
                      </div>
                      <div className="text-sm font-medium">
                        {creatorDiscount.amount > 0 &&
                        creatorDiscount.discountPercent
                          ? `-${formatCurrencyAmount(
                              creatorDiscount.amount,
                              checkoutQuote.currency
                            )} (${creatorDiscount.discountPercent}% off)`
                          : "No discount applied"}
                      </div>
                    </div>
                  </div>

                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="creator-code">Creator code</FieldLabel>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          id="creator-code"
                          onChange={(event) =>
                            setCreatorCodeInput(event.target.value.toUpperCase())
                          }
                          placeholder="Enter creator code"
                          value={creatorCodeInput}
                        />
                        <div className="flex gap-2">
                          <Button
                            disabled={
                              checkoutQuoteQuery.isPending ||
                              creatorCodeInput.trim().length < 3
                            }
                            onClick={() => {
                              setSubmittedCreatorCode(
                                creatorCodeInput.trim() || undefined
                              )
                              void clearPendingCheckoutIntent()
                            }}
                            type="button"
                            variant="outline"
                          >
                            Apply code
                          </Button>
                          {(creatorCodeInput || submittedCreatorCode) && (
                            <Button
                              onClick={() => {
                                setCreatorCodeInput("")
                                setSubmittedCreatorCode(undefined)
                                void clearPendingCheckoutIntent()
                              }}
                              type="button"
                              variant="ghost"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </Field>
                  </FieldGroup>

                  {creatorState === "rejected" ? (
                    <Alert variant="destructive">
                      <AlertTitle>Creator code not applied</AlertTitle>
                      <AlertDescription>
                        {creatorDiscount.message}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {creatorState === "eligible_but_not_entered" ? (
                    <div className="rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                      Enter a creator code before payment if you have one. The
                      server validates the code before Stripe confirmation starts.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card px-6 py-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Payment details
                </h2>
                <p className="text-sm text-muted-foreground">
                  Payment Element appears here after the order is prepared. Cards
                  stay on-site when possible, and redirect-based methods return
                  here to finish.
                </p>
              </div>

              {!getStripePublishableKey() ? (
                <Alert variant="destructive">
                  <AlertTitle>Stripe publishable key missing</AlertTitle>
                  <AlertDescription>
                    Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> before
                    using checkout.
                  </AlertDescription>
                </Alert>
              ) : null}

              {!checkoutResult?.clientSecret ? (
                <div className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
                  Review the order summary, then prepare payment to load the
                  secure Stripe payment form in this section.
                </div>
              ) : null}

              {checkoutResult?.clientSecret && stripePromise ? (
                <Elements
                  key={`${checkoutResult.clientSecret}:${resolvedTheme ?? "system"}`}
                  options={{
                    appearance: getStripeElementsAppearance(resolvedTheme),
                    clientSecret: checkoutResult.clientSecret,
                    customerSessionClientSecret:
                      checkoutResult.customerSessionClientSecret,
                    loader: "auto",
                  }}
                  stripe={stripePromise}
                >
                  <CheckoutPaymentForm
                    clientSecret={checkoutResult.clientSecret}
                    defaultBillingEmail={checkoutResult.defaultBillingEmail}
                    onSubmittingChange={setIsPaymentSubmitting}
                    returnUrl="/checkout/complete"
                    secretType={
                      checkoutResult.secretType === "setup_intent"
                        ? "setup_intent"
                        : "payment_intent"
                    }
                    submitLabel={`Confirm ${selectedPlan.name}`}
                    subtitle="Stripe handles payment confirmation directly inside the page."
                    title="Secure payment"
                    variant="inline"
                  />
                </Elements>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-xl border border-border/70 bg-card px-5 py-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  Order summary
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your first payment is shown below. Renewal returns to the full
                  plan price after the first discounted invoice.
                </p>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Billing</span>
                  <span className="font-medium capitalize">
                    {effectiveSelectedInterval}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {checkoutQuote
                      ? formatCurrencyAmount(
                          checkoutQuote.planSubtotal,
                          checkoutQuote.currency
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Creator discount</span>
                  <span className="font-medium">
                    {checkoutQuote
                      ? checkoutQuote.creatorDiscount.amount > 0
                        ? `-${formatCurrencyAmount(
                            checkoutQuote.creatorDiscount.amount,
                            checkoutQuote.currency
                          )}`
                        : "Not applied"
                      : "—"}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4 text-base font-semibold">
                  <span>First payment</span>
                  <span>
                    {checkoutQuote
                      ? formatCurrencyAmount(
                          checkoutQuote.firstPaymentTotal,
                          checkoutQuote.currency
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                  <span>Renewal amount</span>
                  <span>
                    {checkoutQuote
                      ? formatCurrencyAmount(
                          checkoutQuote.renewalTotal,
                          checkoutQuote.currency
                        )
                      : "—"}
                  </span>
                </div>
                {checkoutQuote?.currencyNotice ? (
                  <p className="text-sm text-muted-foreground">
                    {checkoutQuote.currencyNotice}
                  </p>
                ) : null}
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full"
                  disabled={!canPreparePayment || isPaymentSubmitting}
                  onClick={() => void handleCreateIntent()}
                  size="lg"
                >
                  <IconCreditCard data-icon="inline-start" />
                  {createSubscriptionIntent.isPending
                    ? "Preparing payment..."
                    : checkoutResult?.clientSecret
                      ? "Refresh payment details"
                      : "Continue to payment"}
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/checkout/cancelled">
                    Cancel checkout
                    <IconArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
