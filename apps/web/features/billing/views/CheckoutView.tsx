"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Elements } from "@stripe/react-stripe-js"
import { IconCreditCard } from "@tabler/icons-react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
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
import { PlanSelector } from "@/features/billing/components/PlanSelector"
import {
  BillingClientError,
  useBillingState,
  useCreateSubscriptionIntent,
  usePricingCatalog,
} from "@/features/billing/lib/billing-client"
import type { BillingInterval } from "@/features/billing/lib/billing-types"
import { getStripePublishableKey, stripePromise } from "@/features/billing/lib/stripe"

export function CheckoutView({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const router = useRouter()
  const catalogQuery = usePricingCatalog()
  const billingStateQuery = useBillingState()
  const createSubscriptionIntent = useCreateSubscriptionIntent()
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("month")
  const [selectedPlanKey, setSelectedPlanKey] = useState("")
  const [checkoutResult, setCheckoutResult] = useState<{
    clientSecret?: string
    secretType: "none" | "payment_intent" | "setup_intent"
  } | null>(null)

  const paidPlans =
    catalogQuery.data?.plans.filter((plan) => plan.planType === "paid") ?? []
  const selectedPlan =
    paidPlans.find((plan) => plan.planKey === selectedPlanKey) ?? paidPlans[0] ?? null
  const hasBillingAccess =
    billingStateQuery.data?.accessSource === "paid_subscription" &&
    billingStateQuery.data.subscription !== null

  useEffect(() => {
    if (!catalogQuery.data || selectedPlanKey) {
      return
    }

    setSelectedInterval(catalogQuery.data.currentInterval ?? "month")
    setSelectedPlanKey(
      paidPlans[0]?.planKey ?? catalogQuery.data.plans[0]?.planKey ?? ""
    )
  }, [catalogQuery.data, paidPlans, selectedPlanKey])

  async function handleCreateIntent() {
    if (!selectedPlan) {
      return
    }

    try {
      const result = await createSubscriptionIntent.mutateAsync({
        attemptKey: crypto.randomUUID(),
        interval: selectedInterval,
        planKey: selectedPlan.planKey,
      })

      if (!result.requiresConfirmation || !result.clientSecret) {
        router.push("/checkout/success")
        return
      }

      setCheckoutResult({
        clientSecret: result.clientSecret,
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
        <Card className="w-full border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Checkout unavailable</CardTitle>
            <CardDescription>
              Billing rollout is currently disabled for this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (catalogQuery.isPending || billingStateQuery.isPending) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <Skeleton className="min-h-[28rem] rounded-3xl" />
        <Skeleton className="min-h-[28rem] rounded-3xl" />
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

  if (hasBillingAccess && billingStateQuery.data) {
    return (
      <div className="grid gap-6">
        <CurrentPlanCard state={billingStateQuery.data} />
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>You already have billing access</CardTitle>
            <CardDescription>
              Manage upgrades, downgrades, cancellation, and invoices from the billing portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/billing">Open billing settings</Link>
            </Button>
          </CardContent>
        </Card>
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

  return (
    <div className="grid gap-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Secure checkout</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Choose a plan, review the included product access, and complete payment
          directly inside the app with Stripe Elements and Link where available.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_25rem]">
        <div className="space-y-6">
          <PlanSelector
            interval={selectedInterval}
            onIntervalChange={(interval) => {
              setSelectedInterval(interval)
              setCheckoutResult(null)
            }}
            onSelectPlan={(planKey) => {
              setSelectedPlanKey(planKey)
              setCheckoutResult(null)
            }}
            plans={paidPlans}
            selectedPlanKey={selectedPlan.planKey}
          />
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <BillingSummary
            description={
              checkoutResult?.clientSecret
                ? "The plan selection is ready. Complete payment below to let Stripe finalize the subscription."
                : "Review the selected plan and move straight into Stripe confirmation from the same panel."
            }
            footer={
              checkoutResult?.clientSecret
                ? undefined
                : (
                    <>
                      {!getStripePublishableKey() ? (
                        <Alert variant="destructive">
                          <AlertTitle>Stripe publishable key missing</AlertTitle>
                          <AlertDescription>
                            Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> before using checkout.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <p className="w-full text-sm text-muted-foreground">
                          Payment is collected inside Stripe Elements. Link autofill appears automatically when supported.
                        </p>
                      )}
                      <Button
                        className="w-full"
                        disabled={!getStripePublishableKey() || createSubscriptionIntent.isPending}
                        onClick={() => void handleCreateIntent()}
                        size="lg"
                      >
                        <IconCreditCard data-icon="inline-start" />
                        {createSubscriptionIntent.isPending
                          ? "Preparing secure checkout..."
                          : "Continue to payment"}
                      </Button>
                      <Button asChild className="w-full" variant="ghost">
                        <Link href="/checkout/cancel">Cancel</Link>
                      </Button>
                    </>
                  )
            }
            interval={selectedInterval}
            plan={selectedPlan}
            variant="checkout"
          />
          {checkoutResult?.clientSecret && stripePromise ? (
            <Elements
              key={checkoutResult.clientSecret}
              options={{
                appearance: {
                  labels: "floating",
                  variables: {
                    colorPrimary: "hsl(216 89% 56%)",
                    colorText: "hsl(222 18% 12%)",
                  },
                },
                clientSecret: checkoutResult.clientSecret,
              }}
              stripe={stripePromise}
            >
              <CheckoutPaymentForm
                clientSecret={checkoutResult.clientSecret}
                returnUrl="/checkout/success"
                secretType={
                  checkoutResult.secretType === "setup_intent"
                    ? "setup_intent"
                    : "payment_intent"
                }
                submitLabel={`Confirm ${selectedPlan.name}`}
                subtitle="Payment details stay inside Stripe Elements. Link will appear automatically when supported."
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  )
}
