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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
  const prefix = args.currency === "GBP" ? "" : "Est. "
  return `${prefix}${formatCurrencyAmount(args.amount, args.currency)} / ${args.interval}`
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
      amount:
        (monthly.currency === "GBP" ? "" : "Est. ") +
        formatCurrencyAmount(monthly.amount, monthly.currency),
      detail: plan.pricing.year
        ? "Pay monthly, or choose yearly billing for a lower effective rate when offered."
        : "Billed monthly through Stripe.",
      suffix: "/ month",
    }
  }

  if (plan.pricing.year) {
    const yearly = plan.pricing.year
    return {
      amount:
        (yearly.currency === "GBP" ? "" : "Est. ") +
        formatCurrencyAmount(yearly.amount, yearly.currency),
      detail: "Billed yearly through Stripe.",
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
  currencyNotice,
  pendingCreatorCode,
  selectedCurrency,
}: {
  availableCurrencies: PricingCatalogResponse["availableCurrencies"]
  currencyNotice: PricingCatalogResponse["currencyNotice"]
  pendingCreatorCode?: PendingCreatorCodeSummary | null
  selectedCurrency: PricingCatalogResponse["selectedCurrency"]
}) {
  return (
    <section className="grid gap-6 border-b border-border/70 pb-8 sm:pb-10">
      {pendingCreatorCode ? (
        <CreatorCodeNotice
          code={pendingCreatorCode.code}
          discountPercent={pendingCreatorCode.discountPercent}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid max-w-[48rem] gap-4">
          <Badge className="w-fit" variant="outline">
            Simple plans, clear upgrade path
          </Badge>
          <h1 className="text-4xl leading-[0.94] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Start with what you need. Pay for the depth you actually use.
          </h1>
          <p className="max-w-[42rem] text-base leading-8 text-pretty text-foreground/80 sm:text-lg">
            Track ranked with the essentials, unlock deeper review when you want
            more context, and add creator tooling when your workflow grows.
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card/70 p-4 shadow-sm">
          <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Pricing currency
          </div>
          <PricingCurrencySelect
            currencies={availableCurrencies}
            value={selectedCurrency}
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm leading-6 text-foreground/76 sm:grid-cols-2 sm:gap-6">
        <p>
          Stripe Checkout confirms the final currency, taxes, discounts, and
          total before you pay.
        </p>
        <p>
          {currencyNotice ??
            "Converted currencies are estimates and may move with exchange rates."}
        </p>
      </div>
    </section>
  )
}

export function PricingPlanList({
  catalog,
  signedIn,
  viewport,
}: {
  catalog: PricingCatalogResponse
  signedIn: boolean
  viewport: "desktop" | "mobile"
}) {
  const isMobileView = viewport === "mobile"
  const activePlans = catalog.plans.filter((plan) => plan.active)
  const recommendedPlanKey = getRecommendedPlanKey(activePlans)

  if (activePlans.length === 0) {
    return (
      <section className="rounded-lg border border-border/70 bg-card/60 p-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Plans are being updated
        </h2>
        <p className="mt-2 max-w-[40rem] text-sm leading-7 text-foreground/76 sm:text-base">
          No public plans are active right now. Pricing will appear here as soon
          as the current billing catalog has an active public plan.
        </p>
      </section>
    )
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Choose your plan
          </h2>
          <p className="max-w-[42rem] text-sm leading-7 text-foreground/76 sm:text-base">
            The important differences are up front. The full feature breakdown
            is below when you want the details.
          </p>
        </div>
        <Badge className="w-fit" variant="secondary">
          {activePlans.length} active {activePlans.length === 1 ? "plan" : "plans"}
        </Badge>
      </div>

      <div
        className={cn(
          "grid gap-4",
          isMobileView
            ? "grid-cols-1"
            : activePlans.length >= 3
              ? "md:grid-cols-2 xl:grid-cols-3"
              : "md:grid-cols-2"
        )}
      >
        {activePlans.map((plan) => {
          const isCurrent =
            catalog.currentPlanKey === plan.planKey ||
            plan.relationship === "current"
          const isRecommended =
            plan.planKey === recommendedPlanKey && !isCurrent
          const primaryPrice = getPrimaryPrice(plan)
          const annualSavings = getAnnualSavingsPercent(plan)
          const highlightedFeatures = plan.features.slice(0, 5)
          const remainingFeatureCount = Math.max(
            0,
            plan.features.length - highlightedFeatures.length
          )

          return (
            <Card
              className={cn(
                "relative h-full justify-between bg-card/75 shadow-sm",
                isRecommended && "ring-2 ring-primary/55",
                isCurrent && "bg-primary/5 ring-primary/35"
              )}
              key={plan.planKey}
            >
              <CardHeader className="gap-4">
                <div className="flex min-h-5 flex-wrap items-center gap-2">
                  {isCurrent ? (
                    <Badge variant="default">Current plan</Badge>
                  ) : isRecommended ? (
                    <Badge variant="default">Recommended</Badge>
                  ) : plan.planType === "free" ? (
                    <Badge variant="outline">Start here</Badge>
                  ) : (
                    <Badge variant="outline">Paid plan</Badge>
                  )}
                  {annualSavings ? (
                    <Badge variant="secondary">
                      Save {annualSavings}% yearly
                    </Badge>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="min-h-12 text-sm leading-6 text-foreground/72">
                    {plan.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="grid gap-5">
                <div className="border-y border-border/70 py-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      {primaryPrice.amount}
                    </span>
                    {primaryPrice.suffix ? (
                      <span className="text-sm text-muted-foreground">
                        {primaryPrice.suffix}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {primaryPrice.detail}
                  </p>

                  {plan.pricing.year && plan.pricing.month ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        Yearly
                      </span>
                      <span className="text-muted-foreground">
                        {getPlanPriceLabel(plan.pricing.year)}
                      </span>
                      {annualSavings ? (
                        <span className="text-primary">
                          {annualSavings}% less than 12 monthly payments
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    What you get
                  </div>
                  {highlightedFeatures.length > 0 ? (
                    <ul className="grid gap-2.5">
                      {highlightedFeatures.map((feature) => (
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
                      No public feature list is configured for this plan yet.
                    </p>
                  )}
                  {remainingFeatureCount > 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Plus {remainingFeatureCount} more{" "}
                      {remainingFeatureCount === 1 ? "feature" : "features"} in
                      the comparison below.
                    </p>
                  ) : null}
                </div>
              </CardContent>

              <CardFooter className="grid gap-2 border-t border-border/70">
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
                <p className="text-center text-[0.6875rem] leading-5 text-muted-foreground">
                  {isCurrent
                    ? "You already have this plan."
                    : plan.planType === "free"
                      ? "Create an account and start with the included features."
                      : "Final pricing and eligible discounts are confirmed in Stripe."}
                </p>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export function PricingComparisonDesktop({
  catalog,
}: {
  catalog: PricingCatalogResponse
}) {
  const activePlans = catalog.plans.filter((plan) => plan.active)
  const featureGroups = buildPricingFeatureRows(activePlans)

  if (activePlans.length === 0) {
    return null
  }

  const gridTemplateColumns =
    "minmax(0, 22rem) repeat(" +
    activePlans.length +
    ", minmax(10rem, 1fr))"

  return (
    <section className="grid gap-5">
      <div className="grid gap-2">
        <Badge className="w-fit" variant="outline">
          Full breakdown
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Compare the details
        </h2>
        <p className="max-w-[44rem] text-sm leading-7 text-foreground/76 sm:text-base">
          Use the cards above to pick a direction. Use this table when you want
          the exact feature split before choosing.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/45 shadow-sm">
        <div className="min-w-[64rem]">
          <div
            className="grid border-b border-border/70 bg-muted/35 px-4 py-4"
            style={{ gridTemplateColumns }}
          >
            <div className="pr-6 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Feature
            </div>
            {activePlans.map((plan) => (
              <div className="px-4" key={plan.planKey}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  {catalog.currentPlanKey === plan.planKey ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {featureGroups.map((group) => (
            <div key={group.category}>
              <div className="border-b border-border/70 bg-muted/20 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.category}
              </div>
              {group.rows.map((feature) => (
                <div
                  className="grid border-b border-border/60 px-4 py-4 last:border-b-0"
                  key={feature.featureKey}
                  style={{ gridTemplateColumns }}
                >
                  <div className="pr-6">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <div className="mt-1 max-w-[20rem] text-xs leading-6 text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>

                  {activePlans.map((plan) => {
                    const isIncluded = plan.features.some(
                      (candidate) =>
                        candidate.featureKey === feature.featureKey
                    )

                    return (
                      <div
                        className="flex items-center gap-2 px-4 text-sm"
                        key={plan.planKey + ":" + feature.featureKey}
                      >
                        {isIncluded ? (
                          <>
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                              <IconCheck
                                aria-hidden="true"
                                className="size-3.5 text-primary"
                              />
                            </span>
                            <span className="font-medium">Included</span>
                          </>
                        ) : (
                          <>
                            <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                              <IconMinus
                                aria-hidden="true"
                                className="size-3.5 text-muted-foreground"
                              />
                            </span>
                            <span className="text-muted-foreground">
                              Not included
                            </span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PricingComparisonMobile({
  catalog,
}: {
  catalog: PricingCatalogResponse
}) {
  const activePlans = catalog.plans.filter((plan) => plan.active)
  const featureGroups = buildPricingFeatureRows(activePlans)

  if (activePlans.length === 0) {
    return null
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-2">
        <Badge className="w-fit" variant="outline">
          Full breakdown
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight">
          Compare the details
        </h2>
        <p className="text-sm leading-7 text-foreground/76">
          A compact plan-by-plan breakdown when you want to check every
          included feature.
        </p>
      </div>

      <div className="grid gap-4">
        {featureGroups.map((group) => (
          <section
            className="overflow-hidden rounded-lg border border-border/70 bg-card/55"
            key={group.category}
          >
            <div className="border-b border-border/70 bg-muted/25 px-4 py-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.category}
              </h3>
            </div>
            <div className="grid">
              {group.rows.map((feature) => (
                <div
                  className="grid gap-3 border-b border-border/60 p-4 last:border-b-0"
                  key={feature.featureKey}
                >
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <p className="text-xs leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {activePlans.map((plan) => {
                      const isIncluded = plan.features.some(
                        (candidate) =>
                          candidate.featureKey === feature.featureKey
                      )

                      return (
                        <div
                          className="flex items-center justify-between gap-4 text-sm"
                          key={plan.planKey + ":" + feature.featureKey}
                        >
                          <span className="flex items-center gap-2">
                            <span>{plan.name}</span>
                            {catalog.currentPlanKey === plan.planKey ? (
                              <Badge variant="secondary">Current</Badge>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "flex items-center gap-1.5",
                              isIncluded
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {isIncluded ? (
                              <IconCheck
                                aria-hidden="true"
                                className="size-3.5 text-primary"
                              />
                            ) : (
                              <IconMinus
                                aria-hidden="true"
                                className="size-3.5"
                              />
                            )}
                            {isIncluded ? "Included" : "Not included"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
