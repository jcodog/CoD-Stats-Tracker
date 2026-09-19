import Link from "next/link"
import { IconCheck, IconMinus } from "@tabler/icons-react"

import type {
  PricingCatalogPlan,
  PricingCatalogResponse,
} from "@/features/billing/lib/billing-types"
import { buildAuthHref } from "@/features/auth/lib/auth-redirects"
import { formatCurrencyAmount } from "@/features/billing/lib/format"
import { CreatorCodeNotice } from "@/features/creator-attribution/components/CreatorCodeNotice"
import { PricingCurrencySelect } from "@/features/pricing/components/PricingCurrencySelect"
import type { PendingCreatorCodeSummary } from "@/lib/server/creator-attribution"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type PricingFeatureRow = {
  category: string
  description: string
  featureKey: string
  name: string
}

const CREATOR_FEATURE_GROUP = "Creator tools"
const STANDARD_FEATURE_GROUP = "Features"

function getPlanPriceLabel(args: {
  amount: number
  currency: string
  interval: "month" | "year"
}) {
  return formatCurrencyAmount(args.amount, args.currency) + " / " + args.interval
}

function getPlanCtaLabel(plan: PricingCatalogPlan) {
  const key = plan.planKey.toLowerCase()

  if (key.includes("creator") || plan.name.toLowerCase().includes("creator")) {
    return "Choose Creator"
  }

  if (key.includes("premium") || plan.name.toLowerCase().includes("premium")) {
    return "Choose Premium"
  }

  return `Choose ${plan.name}`
}

function getRecommendedPlanKey(plans: PricingCatalogPlan[]) {
  const paidPlans = plans.filter((plan) => plan.planType === "paid")
  const premiumPlan = paidPlans.find((plan) => {
    const identity = (plan.planKey + " " + plan.name).toLowerCase()
    return identity.includes("premium")
  })

  return premiumPlan?.planKey ?? paidPlans[0]?.planKey ?? null
}

function getPlanHighlights(
  plan: PricingCatalogPlan,
  plans: PricingCatalogPlan[]
) {
  const previousPlan = plans
    .filter((candidate) => candidate.sortOrder < plan.sortOrder)
    .sort((left, right) => right.sortOrder - left.sortOrder)[0]

  if (!previousPlan) {
    return {
      lead: null,
      features: plan.features.slice(0, 5),
    }
  }

  const previousFeatureKeys = new Set(
    previousPlan.features.map((feature) => feature.featureKey)
  )
  const addedFeatures = plan.features.filter(
    (feature) => !previousFeatureKeys.has(feature.featureKey)
  )

  return {
    lead: "Everything in " + previousPlan.name + ", plus",
    features:
      (addedFeatures.length > 0 ? addedFeatures : plan.features).slice(0, 5),
  }
}

function getAnnualSavingsPercent(plan: PricingCatalogPlan) {
  const monthly = plan.pricing.month
  const yearly = plan.pricing.year

  if (
    !monthly ||
    !yearly ||
    monthly.currency !== yearly.currency ||
    monthly.amount <= 0
  ) {
    return null
  }

  const fullYearAtMonthlyRate = monthly.amount * 12

  if (yearly.amount >= fullYearAtMonthlyRate) {
    return null
  }

  return Math.round((1 - yearly.amount / fullYearAtMonthlyRate) * 100)
}

function getPrimaryPrice(plan: PricingCatalogPlan) {
  if (plan.planType === "free") {
    return {
      amount: "Free",
      detail: "Use the included CodStats features without a paid subscription.",
      suffix: "",
    }
  }

  if (plan.pricing.month) {
    const monthly = plan.pricing.month
    return {
      amount: formatCurrencyAmount(monthly.amount, monthly.currency),
      detail: plan.pricing.year ? "Monthly billing" : "Billed monthly",
      suffix: "/ month",
    }
  }

  if (plan.pricing.year) {
    const yearly = plan.pricing.year
    return {
      amount: formatCurrencyAmount(yearly.amount, yearly.currency),
      detail: "Yearly billing",
      suffix: "/ year",
    }
  }

  return {
    amount: "Unavailable",
    detail: "This plan does not currently have a public checkout price.",
    suffix: "",
  }
}

function getContextualPlanCtaLabel(
  plan: PricingCatalogPlan,
  signedIn: boolean,
  isCurrent: boolean
) {
  if (isCurrent) {
    return plan.planType === "free" ? "Open dashboard" : "Manage current plan"
  }

  if (!signedIn) {
    return plan.planType === "free" ? "Start free" : getPlanCtaLabel(plan)
  }

  if (plan.relationship === "downgrade") {
    return "Switch to " + plan.name
  }

  if (plan.relationship === "upgrade") {
    return "Upgrade to " + plan.name
  }

  if (plan.relationship === "switch") {
    return "Switch to " + plan.name
  }

  return plan.planType === "free" ? "Use " + plan.name : getPlanCtaLabel(plan)
}

function getContextualPlanCtaHref(
  plan: PricingCatalogPlan,
  signedIn: boolean,
  isCurrent: boolean
) {
  if (isCurrent && plan.planType === "free") {
    return "/dashboard"
  }

  if (signedIn) {
    return "/settings/billing/plan"
  }

  return plan.planType === "free"
    ? buildAuthHref("/sign-up", "/dashboard")
    : buildAuthHref("/sign-up", "/settings/billing/plan")
}

function buildPricingFeatureRows(plans: PricingCatalogPlan[]) {
  const rowsByKey = new Map<string, PricingFeatureRow>()

  for (const plan of plans) {
    for (const feature of plan.features) {
      if (rowsByKey.has(feature.featureKey)) {
        continue
      }

      rowsByKey.set(feature.featureKey, {
        category:
          feature.category?.trim().toLowerCase() === "creator-tools"
            ? CREATOR_FEATURE_GROUP
            : STANDARD_FEATURE_GROUP,
        description: feature.description,
        featureKey: feature.featureKey,
        name: feature.name,
      })
    }
  }

  const grouped = new Map<string, PricingFeatureRow[]>()

  for (const row of rowsByKey.values()) {
    const currentRows = grouped.get(row.category) ?? []
    currentRows.push(row)
    grouped.set(row.category, currentRows)
  }

  return Array.from(grouped.entries())
    .map(([category, rows]) => ({
      category,
      rows: rows.sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => {
      if (left.category === STANDARD_FEATURE_GROUP) {
        return -1
      }

      if (right.category === STANDARD_FEATURE_GROUP) {
        return 1
      }

      return left.category.localeCompare(right.category)
    })
}

export function PricingIntro({
  availableCurrencies,
  pendingCreatorCode,
  selectedCurrency,
}: {
  availableCurrencies: PricingCatalogResponse["availableCurrencies"]
  pendingCreatorCode?: PendingCreatorCodeSummary | null
  selectedCurrency: PricingCatalogResponse["selectedCurrency"]
}) {
  const isReferenceCurrency = selectedCurrency !== "GBP"

  return (
    <section className="grid gap-7 border-b border-border/80 pb-9 sm:pb-11">
      {pendingCreatorCode ? (
        <CreatorCodeNotice
          code={pendingCreatorCode.code}
          discountPercent={pendingCreatorCode.discountPercent}
        />
      ) : null}

      <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[46rem]">
          <h1 className="text-4xl leading-[1] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
            Pick the CodStats plan that fits how you play.
          </h1>
          <p className="mt-4 max-w-[40rem] text-base leading-7 text-muted-foreground sm:text-lg">
            Start free, move up when you want deeper tracking, and add creator
            tools when your community becomes part of the workflow.
          </p>
        </div>

        <PricingCurrencySelect
          currencies={availableCurrencies}
          value={selectedCurrency}
        />
      </div>

      {isReferenceCurrency ? (
        <p className="max-w-[46rem] text-xs leading-5 text-muted-foreground">
          Converted prices are shown for reference. Checkout charges the GBP
          price; your card provider may apply its own exchange rate or fees.
        </p>
      ) : null}
    </section>
  )
}

export function PricingPlanList({
  catalog,
  signedIn,
}: {
  catalog: PricingCatalogResponse
  signedIn: boolean
}) {
  const activePlans = catalog.plans.filter((plan) => plan.active)
  const recommendedPlanKey = getRecommendedPlanKey(activePlans)

  if (activePlans.length === 0) {
    return (
      <section className="border-y border-border py-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Plans are being updated
        </h2>
        <p className="mt-2 max-w-[40rem] text-sm leading-7 text-muted-foreground">
          No public plans are active right now. Check back shortly.
        </p>
      </section>
    )
  }

  return (
    <section className="grid gap-5">
      <div
        className={cn(
          "grid gap-px overflow-hidden rounded-lg border border-border bg-border",
          activePlans.length >= 3
            ? "md:grid-cols-2 xl:grid-cols-3"
            : "md:grid-cols-2"
        )}
      >
        {activePlans.map((plan) => {
          const isCurrent =
            signedIn &&
            (catalog.currentPlanKey === plan.planKey ||
              plan.relationship === "current")
          const isRecommended =
            plan.planKey === recommendedPlanKey && !isCurrent
          const primaryPrice = getPrimaryPrice(plan)
          const annualSavings = getAnnualSavingsPercent(plan)
          const highlights = getPlanHighlights(plan, activePlans)
          const remainingFeatureCount = Math.max(
            0,
            plan.features.length - highlights.features.length
          )

          return (
            <article
              className={cn(
                "relative flex min-w-0 flex-col bg-card p-5 sm:p-6",
                isRecommended && "bg-primary/[0.045]",
                isCurrent && "bg-muted/35"
              )}
              key={plan.planKey}
            >
              <div className="flex min-h-6 items-center justify-between gap-3">
                <div>
                  {isCurrent ? (
                    <Badge>Current Plan</Badge>
                  ) : isRecommended ? (
                    <Badge>Recommended</Badge>
                  ) : null}
                </div>
                {annualSavings ? (
                  <span className="text-xs font-medium text-primary">
                    Save {annualSavings}% yearly
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {plan.name}
                </h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mt-7 border-b border-border pb-6">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-4xl font-semibold tracking-[-0.035em] tabular-nums">
                    {primaryPrice.amount}
                  </span>
                  {primaryPrice.suffix ? (
                    <span className="text-sm text-muted-foreground">
                      {primaryPrice.suffix}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {primaryPrice.detail}
                </p>

                {plan.pricing.year && plan.pricing.month ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Yearly:{" "}
                    <span className="font-medium text-foreground">
                      {getPlanPriceLabel(plan.pricing.year)}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="flex-1 py-6">
                {highlights.lead ? (
                  <p className="mb-3 text-sm font-medium">{highlights.lead}</p>
                ) : null}

                {highlights.features.length > 0 ? (
                  <ul className="grid gap-2.5">
                    {highlights.features.map((feature) => (
                      <li
                        className="flex gap-2.5 text-sm leading-6"
                        key={feature.featureKey}
                      >
                        <IconCheck
                          aria-hidden="true"
                          className="mt-1 size-4 shrink-0 text-primary"
                        />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Core CodStats access.
                  </p>
                )}

                {remainingFeatureCount > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {remainingFeatureCount} more{" "}
                    {remainingFeatureCount === 1 ? "feature" : "features"} in the
                    comparison below.
                  </p>
                ) : null}
              </div>

              <div className="border-t border-border pt-5">
                <Link
                  href={getContextualPlanCtaHref(plan, signedIn, isCurrent)}
                  className={buttonVariants({
                    className: "w-full",
                    size: "lg",
                    variant: isRecommended ? "default" : "outline",
                  })}
                >
                  {getContextualPlanCtaLabel(plan, signedIn, isCurrent)}
                </Link>
                {isCurrent ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    This is your active plan.
                  </p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {catalog.selectedCurrency === "GBP"
          ? "Prices shown in GBP. Applicable taxes are confirmed in checkout."
          : "Converted prices are for reference; checkout charges the GBP price."}
      </p>
    </section>
  )
}

export function PricingComparison({
  catalog,
}: {
  catalog: PricingCatalogResponse
}) {
  const activePlans = catalog.plans.filter((plan) => plan.active)
  const featureGroups = buildPricingFeatureRows(activePlans)
  if (!activePlans.length) return null
  return (
    <section className="grid gap-5" aria-labelledby="pricing-comparison-title">
      <div className="grid gap-2">
        <h2
          id="pricing-comparison-title"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Compare Plans
        </h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Exact feature availability across every active plan.
        </p>
      </div>
      <div
        role="region"
        aria-label="Plan feature comparison"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Features included in each active CodStats plan
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className="min-w-48 p-4 font-medium">
                Feature
              </th>
              {activePlans.map((plan) => (
                <th
                  scope="col"
                  key={plan.planKey}
                  className="min-w-36 p-4 font-semibold"
                >
                  {plan.name}
                  {catalog.currentPlanKey === plan.planKey ? (
                    <Badge className="ml-2" variant="secondary">
                      Current
                    </Badge>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          {featureGroups.map((group) => (
            <tbody key={group.category}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={activePlans.length + 1}
                  className="border-y border-border bg-muted/20 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {group.category}
                </th>
              </tr>
              {group.rows.map((feature) => (
                <tr
                  className="border-b border-border/60 last:border-0"
                  key={feature.featureKey}
                >
                  <th scope="row" className="p-4 font-medium">
                    <span>{feature.name}</span>
                    <p className="mt-1 max-w-xs text-xs leading-6 font-normal text-muted-foreground">
                      {feature.description}
                    </p>
                  </th>
                  {activePlans.map((plan) => {
                    const included = plan.features.some(
                      (item) => item.featureKey === feature.featureKey
                    )
                    return (
                      <td key={plan.planKey} className="p-4">
                        <span className="inline-flex items-center gap-2">
                          {included ? (
                            <IconCheck
                              aria-hidden="true"
                              className="size-4 text-primary"
                            />
                          ) : (
                            <IconMinus
                              aria-hidden="true"
                              className="size-4 text-muted-foreground"
                            />
                          )}
                          <span>{included ? "Included" : "Not included"}</span>
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}
