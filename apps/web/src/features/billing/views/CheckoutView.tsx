"use client"

import Link from "next/link"
import { useState } from "react"
import {
  IconArrowRight,
  IconExternalLink,
  IconLink,
  IconTicket,
} from "@tabler/icons-react"
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
import type {
  BillingInterval,
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
    args.status === "active" ||
    args.status === "trialing" ||
    args.status === "past_due" ||
    args.status === "paused"
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

function CheckoutLoadingState() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-18 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

export function CheckoutView({
  checkoutEnabled,
  initialInterval,
  initialCreatorCode,
  initialPlanKey,
  preferredCurrency,
  viewport = "desktop",
}: {
  checkoutEnabled: boolean
  initialInterval: BillingInterval
  initialCreatorCode?: string | null
  initialPlanKey: string
  preferredCurrency: SupportedPricingCurrency
  viewport?: RequestViewport
}) {
  const isMobileView = viewport === "mobile"
  const catalogQuery = usePricingCatalog(preferredCurrency)
  const billingStateQuery = useBillingState()
  const createCheckoutSession = useCreateSubscriptionCheckoutSession()
  const [creatorCodeInput, setCreatorCodeInput] = useState(
    initialCreatorCode ?? ""
  )
  const [submittedCreatorCode, setSubmittedCreatorCode] = useState<
    string | undefined
  >(initialCreatorCode ?? undefined)
  const [checkoutSessionError, setCheckoutSessionError] = useState<
    string | null
  >(null)

  const paidPlans =
    catalogQuery.data?.plans.filter(
      (plan) => plan.planType === "paid" && plan.active
    ) ?? []
  const selectedPlan = getSelectedPlan(paidPlans, initialPlanKey)
  const billingState = billingStateQuery.data
  const hasCreatorGrantAccess =
    (billingState?.accessSource === "creator_grant" ||
      billingState?.accessSource === "managed_grant_subscription") &&
    billingState.hasCreatorAccess
  const hasPaidAccess = hasActivePaidSubscription({
    status: billingState?.subscription?.status,
  })
  const checkoutQuoteQuery = useCheckoutQuote(
    selectedPlan &&
      billingState !== undefined &&
      !hasCreatorGrantAccess &&
      !hasPaidAccess
      ? {
          creatorCode: submittedCreatorCode,
          interval: initialInterval,
          planKey: selectedPlan.planKey,
          preferredCurrency,
        }
      : null
  )

  function handleApplyCreatorCode() {
    const nextCreatorCode =
      creatorCodeInput.trim().toUpperCase() || undefined
    setSubmittedCreatorCode(nextCreatorCode)
  }

  function handleClearCreatorCode() {
    setCreatorCodeInput("")
    setSubmittedCreatorCode(undefined)
  }

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code)
    toast.success("Creator code copied.")
  }

  async function handleStartHostedCheckout() {
    if (!selectedPlan) {
      return
    }

    setCheckoutSessionError(null)

    try {
      const session = await createCheckoutSession.mutateAsync({
        creatorCode: submittedCreatorCode,
        interval: initialInterval,
        planKey: selectedPlan.planKey,
        preferredCurrency,
      })

      window.location.assign(session.checkoutUrl)
    } catch (error) {
      setCheckoutSessionError(
        error instanceof BillingClientError
          ? error.message
          : "Unable to start Stripe Checkout."
      )
    }
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
    return <CheckoutLoadingState />
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
              manage the subscription in Stripe instead of starting a duplicate
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
              Continue to Stripe Checkout to confirm final currency, taxes,
              discounts, and total.
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
              Creator-code discounts are applied server-side as a first-payment
              Stripe coupon.
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

      <section className="flex flex-col gap-4 border-y border-border/70 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <div className="font-medium text-foreground">Stripe-hosted payment</div>
          <p className="text-sm text-muted-foreground">
            Adaptive Pricing may offer local presentment currencies when this
            Checkout Session is eligible.
          </p>
        </div>
        <Button
          className={isMobileView ? "w-full justify-center" : undefined}
          disabled={createCheckoutSession.isPending}
          onClick={() => void handleStartHostedCheckout()}
        >
          {createCheckoutSession.isPending
            ? "Opening Stripe..."
            : "Continue to Stripe"}
          {!createCheckoutSession.isPending ? (
            <IconExternalLink data-icon="inline-end" />
          ) : null}
        </Button>
      </section>
    </div>
  )
}
