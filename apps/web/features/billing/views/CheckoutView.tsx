"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Elements } from "@stripe/react-stripe-js"
import type { Appearance } from "@stripe/stripe-js"
import { IconCreditCard } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

import { BillingSummary } from "@/features/billing/components/BillingSummary"
import { CheckoutPaymentForm } from "@/features/billing/components/CheckoutPaymentForm"
import { CurrentPlanCard } from "@/features/billing/components/CurrentPlanCard"
import { PlanSelector } from "@/features/billing/components/PlanSelector"
import {
  BillingClientError,
  useAbandonPendingCheckout,
  useBillingState,
  useCreateSubscriptionIntent,
  usePricingCatalog,
} from "@/features/billing/lib/billing-client"
import type { BillingInterval } from "@/features/billing/lib/billing-types"
import { getStripePublishableKey, stripePromise } from "@/features/billing/lib/stripe"

export function CheckoutView({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const catalogQuery = usePricingCatalog()
  const billingStateQuery = useBillingState()
  const createSubscriptionIntent = useCreateSubscriptionIntent()
  const abandonPendingCheckout = useAbandonPendingCheckout()
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("month")
  const [selectedPlanKey, setSelectedPlanKey] = useState("")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState<{
    clientSecret?: string
    customerSessionClientSecret?: string
    defaultBillingEmail?: string
    secretType: "none" | "payment_intent" | "setup_intent"
  } | null>(null)

  const paidPlans =
    catalogQuery.data?.plans.filter((plan) => plan.planType === "paid") ?? []
  const selectedPlan =
    paidPlans.find((plan) => plan.planKey === selectedPlanKey) ?? paidPlans[0] ?? null
  const hasBillingAccess =
    billingStateQuery.data?.accessSource === "paid_subscription" &&
    billingStateQuery.data.subscription !== null
  const stripeAppearance: Appearance =
    resolvedTheme === "dark"
      ? {
          labels: "floating" as const,
          theme: "night" as const,
          variables: {
            borderRadius: "12px",
            colorBackground: "#111317",
            colorDanger: "#ef4444",
            colorPrimary: "#0f766e",
            colorText: "#f4f4f5",
            colorTextSecondary: "#a1a1aa",
            colorPrimaryText: "#f8fafc",
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
          },
          rules: {
            ".AccordionItem": {
              backgroundColor: "#111317",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "none",
            },
            ".Input": {
              backgroundColor: "#151821",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "none",
            },
            ".Input:focus": {
              border: "1px solid rgba(15,118,110,0.8)",
              boxShadow: "0 0 0 3px rgba(15,118,110,0.18)",
            },
            ".Label": {
              color: "#d4d4d8",
            },
            ".Tab": {
              backgroundColor: "#151821",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "none",
            },
            ".Tab--selected": {
              backgroundColor: "#1a1f29",
              borderColor: "rgba(15,118,110,0.65)",
              boxShadow: "0 0 0 1px rgba(15,118,110,0.18)",
            },
          },
        }
      : {
          labels: "floating" as const,
          theme: "flat" as const,
          variables: {
            borderRadius: "12px",
            colorBackground: "#ffffff",
            colorDanger: "#dc2626",
            colorPrimary: "#0f766e",
            colorText: "#111827",
            colorTextSecondary: "#6b7280",
            colorPrimaryText: "#ffffff",
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
          },
          rules: {
            ".AccordionItem": {
              backgroundColor: "#ffffff",
              border: "1px solid rgba(17,24,39,0.1)",
              boxShadow: "none",
            },
            ".Input": {
              backgroundColor: "#ffffff",
              border: "1px solid rgba(17,24,39,0.12)",
              boxShadow: "none",
            },
            ".Input:focus": {
              border: "1px solid rgba(15,118,110,0.75)",
              boxShadow: "0 0 0 3px rgba(15,118,110,0.12)",
            },
            ".Label": {
              color: "#374151",
            },
            ".Tab": {
              backgroundColor: "#ffffff",
              border: "1px solid rgba(17,24,39,0.1)",
              boxShadow: "none",
            },
            ".Tab--selected": {
              backgroundColor: "#f8fafc",
              borderColor: "rgba(15,118,110,0.45)",
              boxShadow: "0 0 0 1px rgba(15,118,110,0.12)",
            },
          },
        }

  useEffect(() => {
    if (!catalogQuery.data || selectedPlanKey) {
      return
    }

    setSelectedInterval(catalogQuery.data.currentInterval ?? "month")
    setSelectedPlanKey(
      paidPlans[0]?.planKey ?? catalogQuery.data.plans[0]?.planKey ?? ""
    )
  }, [catalogQuery.data, paidPlans, selectedPlanKey])

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

  async function handleClosePaymentDialog() {
    if (isPaymentSubmitting) {
      toast.error("Wait for Stripe confirmation to finish before closing checkout.")
      return
    }

    setIsPaymentDialogOpen(false)
    await clearPendingCheckoutIntent()
  }

  async function handleCreateIntent() {
    if (!selectedPlan) {
      return
    }

    if (checkoutResult?.clientSecret) {
      setIsPaymentDialogOpen(true)
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
        customerSessionClientSecret: result.customerSessionClientSecret,
        defaultBillingEmail: result.defaultBillingEmail,
        secretType: result.secretType,
      })
      setIsPaymentDialogOpen(true)
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
              setIsPaymentDialogOpen(false)
              void clearPendingCheckoutIntent()
            }}
            onSelectPlan={(planKey) => {
              setSelectedPlanKey(planKey)
              setIsPaymentDialogOpen(false)
              void clearPendingCheckoutIntent()
            }}
            plans={paidPlans}
            selectedPlanKey={selectedPlan.planKey}
          />
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
          <BillingSummary
            description={
              checkoutResult?.clientSecret
                ? "Payment details are ready in the secure checkout dialog. Reopen it any time before changing plans."
                : "Review the selected plan and move straight into Stripe confirmation from the same panel."
            }
            footer={
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
                    Payment is collected in a secure Stripe dialog. Link autofill appears automatically when supported.
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
                    : checkoutResult?.clientSecret
                      ? "Resume payment"
                      : "Continue to payment"}
                </Button>
              </>
            }
            interval={selectedInterval}
            plan={selectedPlan}
            variant="checkout"
          />
        </div>
      </div>

      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsPaymentDialogOpen(true)
            return
          }

          void handleClosePaymentDialog()
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] border border-border/70 bg-card p-0 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.72)] sm:max-w-2xl">
          <div className="rounded-[22px] bg-background/70 p-1">
            <div className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[20px] bg-card">
              <DialogHeader className="border-b border-border/70 px-6 py-5">
                <DialogTitle>Secure payment</DialogTitle>
                <DialogDescription>
                  Complete {selectedPlan.name} inside Stripe Elements with Link where available.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 overflow-y-auto px-6 py-5">
                {checkoutResult?.clientSecret && stripePromise ? (
                  <Elements
                    key={`${checkoutResult.clientSecret}:${resolvedTheme ?? "system"}`}
                    options={{
                      appearance: stripeAppearance,
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
                      returnUrl="/checkout/success"
                      secretType={
                        checkoutResult.secretType === "setup_intent"
                          ? "setup_intent"
                          : "payment_intent"
                      }
                      submitLabel={`Confirm ${selectedPlan.name}`}
                      variant="dialog"
                    />
                  </Elements>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
