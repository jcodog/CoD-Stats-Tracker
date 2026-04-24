"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { IconArrowRight } from "@tabler/icons-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import {
  useBillingState,
  usePricingCatalog,
} from "@/features/billing/lib/billing-client"
import { formatCurrencyAmount } from "@/features/billing/lib/format"
import { PricingCurrencySelect } from "@/features/pricing/components/PricingCurrencySelect"
import type {
  BillingInterval,
  PricingCatalogPlan,
  SupportedPricingCurrency,
} from "@/features/billing/lib/billing-types"

function hasActiveCreatorGrantAccess(
  accessSource: string | null | undefined,
  hasCreatorAccess: boolean | undefined
) {
  return (
    hasCreatorAccess &&
    (accessSource === "creator_grant" ||
      accessSource === "managed_grant_subscription")
  )
}

function getPlanPrice(plan: PricingCatalogPlan, interval: BillingInterval) {
  return interval === "year" ? plan.pricing.year : plan.pricing.month
}

export function UpgradePlanView({
  preferredCurrency,
}: {
  preferredCurrency: SupportedPricingCurrency
}) {
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval>("month")
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null)
  const catalogQuery = usePricingCatalog(preferredCurrency)
  const billingStateQuery = useBillingState()
  const catalog = catalogQuery.data
  const paidPlans =
    catalog?.plans.filter((plan) => plan.planType === "paid" && plan.active) ??
    []
  const initialPlan =
    paidPlans.find((plan) => {
      const price = getPlanPrice(plan, selectedInterval)
      return price !== null
    }) ?? null
  const selectedPlan =
    paidPlans.find((plan) => plan.planKey === selectedPlanKey) ?? initialPlan

  useEffect(() => {
    if (!selectedPlanKey && initialPlan) {
      setSelectedPlanKey(initialPlan.planKey)
      return
    }

    if (
      selectedPlanKey &&
      !paidPlans.some(
        (plan) =>
          plan.planKey === selectedPlanKey &&
          getPlanPrice(plan, selectedInterval) !== null
      )
    ) {
      setSelectedPlanKey(initialPlan?.planKey ?? null)
    }
  }, [initialPlan, paidPlans, selectedInterval, selectedPlanKey])

  if (catalogQuery.isPending || billingStateQuery.isPending) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (
    catalogQuery.isError ||
    billingStateQuery.isError ||
    !catalogQuery.data ||
    !billingStateQuery.data
  ) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Plans failed to load</AlertTitle>
        <AlertDescription>Refresh the page and try again.</AlertDescription>
      </Alert>
    )
  }

  if (
    hasActiveCreatorGrantAccess(
      billingStateQuery.data.accessSource,
      billingStateQuery.data.hasCreatorAccess
    )
  ) {
    return (
      <Alert>
        <AlertTitle>Creator access is already active</AlertTitle>
        <AlertDescription>
          This account is currently covered by a creator grant, so self-serve
          checkout is unavailable until that access ends.
        </AlertDescription>
      </Alert>
    )
  }

  if (
    billingStateQuery.data.subscription &&
    ["active", "trialing", "past_due", "paused"].includes(
      billingStateQuery.data.subscription.status
    )
  ) {
    return (
      <Alert>
        <AlertTitle>Billing is already managed in-app</AlertTitle>
        <AlertDescription>
          This account already has a Stripe-managed subscription path. Open
          billing settings to change plans instead of starting a fresh checkout.
        </AlertDescription>
      </Alert>
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
      <section className="grid gap-4 border-b border-border/70 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Upgrade</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Choose the plan first. Checkout is a separate step that only
              prepares payment for the selection you confirm here.
            </p>
          </div>

          <div className="sm:pt-1">
            <PricingCurrencySelect
              currencies={catalog?.availableCurrencies ?? [preferredCurrency]}
              value={catalog?.selectedCurrency ?? preferredCurrency}
            />
          </div>
        </div>

        {catalog?.currencyNotice ? (
          <p className="text-sm text-muted-foreground">
            {catalog.currencyNotice}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {(["month", "year"] as const).map((interval) => (
            <Button
              key={interval}
              onClick={() => setSelectedInterval(interval)}
              size="sm"
              variant={selectedInterval === interval ? "default" : "outline"}
            >
              {interval === "month" ? "Monthly" : "Yearly"}
            </Button>
          ))}
        </div>

        <div className="border-y border-border/70">
          {paidPlans.map((plan) => {
            const price = getPlanPrice(plan, selectedInterval)
            const selected = selectedPlan.planKey === plan.planKey

            return (
              <button
                className={`grid w-full gap-4 border-b border-border/70 px-0 py-5 text-left transition-colors last:border-b-0 ${selected ? "bg-muted/20" : ""}`}
                key={plan.planKey}
                onClick={() => setSelectedPlanKey(plan.planKey)}
                type="button"
              >
                <div className="grid gap-4 px-1 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">{plan.name}</span>
                      {selected ? (
                        <span className="text-xs text-muted-foreground">
                          selected
                        </span>
                      ) : null}
                    </div>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <div className="grid gap-1 lg:justify-items-end">
                    <span className="text-sm text-muted-foreground">
                      {selectedInterval === "month" ? "Monthly" : "Yearly"}
                    </span>
                    <span className="text-2xl font-semibold tracking-tight">
                      {price
                        ? formatCurrencyAmount(price.amount, price.currency)
                        : "Not offered"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {price
                        ? `Billed ${selectedInterval === "month" ? "monthly" : "yearly"}`
                        : "No price for this interval"}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <div className="text-sm text-muted-foreground">Selected</div>
          <div className="text-lg font-semibold">
            {selectedPlan.name} / {selectedInterval}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/billing">Back to billing</Link>
          </Button>
          <Button asChild>
            <Link
              href={`/checkout?plan=${encodeURIComponent(selectedPlan.planKey)}&interval=${selectedInterval}&currency=${catalog?.selectedCurrency ?? preferredCurrency}`}
            >
              Continue to checkout
              <IconArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
