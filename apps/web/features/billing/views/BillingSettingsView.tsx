"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Elements } from "@stripe/react-stripe-js"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

import { BillingSummary } from "@/features/billing/components/BillingSummary"
import { CheckoutPaymentForm } from "@/features/billing/components/CheckoutPaymentForm"
import { CurrentPlanCard } from "@/features/billing/components/CurrentPlanCard"
import { InvoiceHistoryTable } from "@/features/billing/components/InvoiceHistoryTable"
import { PlanSelector } from "@/features/billing/components/PlanSelector"
import {
  BillingClientError,
  useBillingState,
  useCancelSubscription,
  useInvoiceHistory,
  usePreviewSubscriptionChange,
  usePricingCatalog,
  useReactivateSubscription,
  useUpdateSubscriptionPlan,
} from "@/features/billing/lib/billing-client"
import type {
  BillingChangePreview,
  BillingInterval,
  BillingResolvedState,
  PricingCatalogPlan,
} from "@/features/billing/lib/billing-types"
import { formatCurrencyAmount, formatDateLabel } from "@/features/billing/lib/format"
import { getStripePublishableKey, stripePromise } from "@/features/billing/lib/stripe"

type BillingSettingsSection = "invoices" | "overview" | "plan"

function findPlanForState(
  plans: PricingCatalogPlan[],
  state: BillingResolvedState | null | undefined
) {
  return plans.find((plan) => plan.planKey === state?.effectivePlanKey) ?? null
}

export function BillingSettingsView(args: {
  checkoutEnabled: boolean
  section: BillingSettingsSection
}) {
  const billingStateQuery = useBillingState()
  const pricingCatalogQuery = usePricingCatalog()
  const invoicesQuery = useInvoiceHistory({
    enabled: args.section === "invoices" || args.section === "overview",
  })
  const previewChange = usePreviewSubscriptionChange()
  const updateSubscription = useUpdateSubscriptionPlan()
  const cancelSubscription = useCancelSubscription()
  const reactivateSubscription = useReactivateSubscription()
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("month")
  const [selectedPlanKey, setSelectedPlanKey] = useState("")
  const [changePreview, setChangePreview] = useState<BillingChangePreview | null>(null)
  const [confirmationSecret, setConfirmationSecret] = useState<{
    clientSecret: string
    secretType: "payment_intent" | "setup_intent"
  } | null>(null)

  const state = billingStateQuery.data
  const catalog = pricingCatalogQuery.data
  const paidPlans = catalog?.plans.filter((plan) => plan.planType === "paid") ?? []
  const currentPlan = findPlanForState(catalog?.plans ?? [], state)
  const selectedPlan =
    paidPlans.find((plan) => plan.planKey === selectedPlanKey) ?? currentPlan ?? paidPlans[0]

  useEffect(() => {
    if (!catalog || selectedPlanKey) {
      return
    }

    setSelectedInterval(state?.subscription?.interval ?? catalog.currentInterval ?? "month")
    setSelectedPlanKey(
      currentPlan?.planKey ?? paidPlans[0]?.planKey ?? catalog.plans[0]?.planKey ?? ""
    )
  }, [catalog, currentPlan?.planKey, paidPlans, selectedPlanKey, state?.subscription?.interval])

  async function handlePreviewChange() {
    if (!selectedPlan) {
      return
    }

    try {
      const result = await previewChange.mutateAsync({
        interval: selectedInterval,
        planKey: selectedPlan.planKey,
      })
      setChangePreview(result)
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to preview the billing change."
      )
    }
  }

  async function handleApplyChange() {
    if (!selectedPlan) {
      return
    }

    try {
      const result = await updateSubscription.mutateAsync({
        interval: selectedInterval,
        planKey: selectedPlan.planKey,
      })

      if (result.clientSecret && result.requiresConfirmation) {
        setConfirmationSecret({
          clientSecret: result.clientSecret,
          secretType:
            result.secretType === "setup_intent"
              ? "setup_intent"
              : "payment_intent",
        })
      } else {
        toast.success("Billing change submitted.")
      }

      setChangePreview(null)
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to change the subscription."
      )
    }
  }

  async function handleCancel() {
    try {
      await cancelSubscription.mutateAsync()
      toast.success("Cancellation scheduled.")
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to cancel the subscription."
      )
    }
  }

  async function handleReactivate() {
    try {
      await reactivateSubscription.mutateAsync()
      toast.success("Subscription reactivated.")
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to reactivate the subscription."
      )
    }
  }

  if (
    billingStateQuery.isPending ||
    pricingCatalogQuery.isPending ||
    (args.section === "invoices" && invoicesQuery.isPending)
  ) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    )
  }

  if (billingStateQuery.isError || pricingCatalogQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Billing failed to load</AlertTitle>
        <AlertDescription>
          The billing portal could not load the current account state.
        </AlertDescription>
      </Alert>
    )
  }

  if (!state || !catalog) {
    return (
      <Alert>
        <AlertTitle>Billing not available</AlertTitle>
        <AlertDescription>
          No billing state is available for this session yet.
        </AlertDescription>
      </Alert>
    )
  }

  const navigation = [
    { href: "/settings/billing", label: "Overview", key: "overview" },
    { href: "/settings/billing/plan", label: "Plan", key: "plan" },
    { href: "/settings/billing/invoices", label: "Invoices", key: "invoices" },
  ] as const

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Settings
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Billing portal</h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Manage current access, plan changes, cancellation, and invoice history
            from one billing model backed by Stripe reconciliation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {navigation.map((item) => (
            <Button
              asChild
              key={item.key}
              variant={args.section === item.key ? "default" : "outline"}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {(args.section === "overview" || args.section === "plan") && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
          <div className="space-y-6">
            <CurrentPlanCard
              onCancel={state.subscription ? () => void handleCancel() : undefined}
              onReactivate={
                state.subscription?.cancelAtPeriodEnd
                  ? () => void handleReactivate()
                  : undefined
              }
              state={state}
            />

            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>Entitlement summary</CardTitle>
                <CardDescription>
                  Final access is resolved from subscription state, creator overrides,
                  and any explicit entitlement adjustments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {state.effectiveFeatures.map((feature) => (
                    <Badge key={feature.key} variant="secondary">
                      {feature.name}
                    </Badge>
                  ))}
                </div>
                {state.creatorGrant ? (
                  <Alert>
                    <AlertTitle>Creator partnership access</AlertTitle>
                    <AlertDescription>
                      Local creator access is active for {state.creatorGrant.planKey}
                      {state.creatorGrant.endsAt
                        ? ` until ${formatDateLabel(state.creatorGrant.endsAt)}`
                        : "."}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            {args.section === "plan" ? (
              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>Change plan</CardTitle>
                  <CardDescription>
                    Immediate upgrades use Stripe proration invoices. Downgrades are
                    scheduled for the next renewal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {state.accessSource === "paid_subscription" ? (
                    <>
                      <PlanSelector
                        interval={selectedInterval}
                        onIntervalChange={(interval) => {
                          setSelectedInterval(interval)
                          setChangePreview(null)
                        }}
                        onSelectPlan={(planKey) => {
                          setSelectedPlanKey(planKey)
                          setChangePreview(null)
                        }}
                        plans={paidPlans}
                        selectedPlanKey={selectedPlan?.planKey ?? ""}
                      />
                      {selectedPlan ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {selectedPlan.name}{" "}
                                <span className="text-muted-foreground">
                                  ({selectedInterval})
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Review proration and timing before applying the change.
                              </div>
                            </div>
                            <Button
                              disabled={
                                previewChange.isPending ||
                                selectedPlan.planKey === state.effectivePlanKey &&
                                  selectedInterval === state.subscription?.interval
                              }
                              onClick={() => void handlePreviewChange()}
                              variant="outline"
                            >
                              {previewChange.isPending ? "Reviewing..." : "Review change"}
                            </Button>
                          </div>

                          {changePreview ? (
                            <Card className="border-border/70 bg-muted/10">
                              <CardHeader>
                                <CardTitle className="text-lg">
                                  Change summary
                                </CardTitle>
                                <CardDescription>{changePreview.summary}</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Current amount
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrencyAmount(changePreview.currentAmount, selectedPlan.pricing.month?.currency ?? selectedPlan.pricing.year?.currency ?? "gbp")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Target amount
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrencyAmount(changePreview.targetAmount, selectedPlan.pricing.month?.currency ?? selectedPlan.pricing.year?.currency ?? "gbp")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Due now
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrencyAmount(changePreview.amountDueNow, selectedPlan.pricing.month?.currency ?? selectedPlan.pricing.year?.currency ?? "gbp")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Effective date
                                  </span>
                                  <span className="font-medium">
                                    {formatDateLabel(changePreview.effectiveAt)}
                                  </span>
                                </div>
                                <Button
                                  disabled={updateSubscription.isPending}
                                  onClick={() => void handleApplyChange()}
                                >
                                  {updateSubscription.isPending
                                    ? "Applying..."
                                    : "Apply billing change"}
                                </Button>
                              </CardContent>
                            </Card>
                          ) : null}
                        </div>
                      ) : null}

                      {confirmationSecret?.clientSecret && stripePromise ? (
                        <Elements
                          key={confirmationSecret.clientSecret}
                          options={{
                            appearance: {
                              labels: "floating",
                              variables: {
                                colorPrimary: "hsl(216 89% 56%)",
                              },
                            },
                            clientSecret: confirmationSecret.clientSecret,
                          }}
                          stripe={stripePromise}
                        >
                          <CheckoutPaymentForm
                            clientSecret={confirmationSecret.clientSecret}
                            returnUrl="/settings/billing/plan"
                            secretType={confirmationSecret.secretType}
                            submitLabel="Confirm plan change"
                            subtitle="Stripe may require payment confirmation before the change is finalized."
                            title="Confirm proration payment"
                          />
                        </Elements>
                      ) : null}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <AlertTitle>No paid subscription on file</AlertTitle>
                        <AlertDescription>
                          Start from checkout to subscribe to a paid plan.
                        </AlertDescription>
                      </Alert>
                      {args.checkoutEnabled ? (
                        <Button asChild>
                          <Link href="/checkout">Open checkout</Link>
                        </Button>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            {currentPlan ? (
              <BillingSummary
                description="Effective access and current pricing posture."
                interval={state.subscription?.interval ?? selectedInterval}
                plan={currentPlan}
                title="Current summary"
              />
            ) : null}
            {!args.checkoutEnabled ? (
              <Alert>
                <AlertTitle>Checkout paused</AlertTitle>
                <AlertDescription>
                  New plan purchases and reactivations are currently disabled by
                  feature flag.
                </AlertDescription>
              </Alert>
            ) : null}
            {!getStripePublishableKey() && confirmationSecret ? (
              <Alert variant="destructive">
                <AlertTitle>Stripe publishable key missing</AlertTitle>
                <AlertDescription>
                  Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> before confirming
                  client-side payment actions.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      )}

      {(args.section === "overview" || args.section === "invoices") && (
        <InvoiceHistoryTable invoices={invoicesQuery.data ?? []} />
      )}
    </div>
  )
}
