import { IconCheck, IconMinus } from "@tabler/icons-react"

import type { PricingCatalogPlan, PricingCatalogResponse } from "@/features/billing/lib/billing-types"
import { formatCurrencyAmount } from "@/features/billing/lib/format"

type PricingFeatureRow = {
  category: string
  description: string
  featureKey: string
  name: string
}

function getPlanPriceLabel(args: {
  amount: number
  currency: string
  interval: "month" | "year"
}) {
  return `${formatCurrencyAmount(args.amount, args.currency)} / ${args.interval}`
}

function buildPricingFeatureRows(plans: PricingCatalogPlan[]) {
  const rowsByKey = new Map<string, PricingFeatureRow>()

  for (const plan of plans) {
    for (const feature of plan.features) {
      if (rowsByKey.has(feature.featureKey)) {
        continue
      }

      rowsByKey.set(feature.featureKey, {
        category: feature.category?.trim() || "Included features",
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
    .sort((left, right) => left.category.localeCompare(right.category))
}

export function PricingIntro() {
  return (
    <section className="grid gap-6 border-b border-border/70 pb-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
      <div className="grid gap-3">
        <h1 className="max-w-[44rem] text-4xl leading-[0.96] font-semibold tracking-tight text-balance sm:text-5xl">
          Pricing
        </h1>
        <p className="max-w-[40rem] text-base leading-8 text-pretty text-foreground/78 sm:text-lg">
          Live CodStats plan and feature pricing from the current billing
          catalog. This page is read-only and does not start checkout.
        </p>
      </div>

      <div className="grid gap-3 text-sm leading-7 text-foreground/68">
        <div className="border-b border-border/70 pb-3">
          All public plan prices here come from the live billing catalog and are
          shown in GBP when a paid interval is available.
        </div>
        <div className="border-b border-border/70 pb-3">
          Subscription management and billing changes stay inside the signed-in
          billing flow.
        </div>
      </div>
    </section>
  )
}

export function PricingPlanList({
  catalog,
  viewport,
}: {
  catalog: PricingCatalogResponse
  viewport: "desktop" | "mobile"
}) {
  const isMobileView = viewport === "mobile"

  if (catalog.plans.length === 0) {
    return (
      <section className="grid gap-4 border-y border-border/70 py-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Plans in the current catalog
        </h2>
        <p className="max-w-[40rem] text-sm leading-7 text-foreground/72 sm:text-base">
          No public plans are active right now. Pricing will appear here as soon
          as the current billing catalog has an active public plan.
        </p>
      </section>
    )
  }

  return (
    <section
      className={
        isMobileView
          ? "grid gap-4"
          : "grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start"
      }
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Plans in the current catalog
        </h2>
        <p className="max-w-[22rem] text-sm leading-7 text-foreground/72 sm:max-w-[24rem] sm:text-base">
          Each plan below reads from the same billing source of truth used by
          the product.
        </p>
      </div>

      <div className="border-y border-border/70">
        {catalog.plans.map((plan) => (
          <article
            className="border-b border-border/70 py-5 last:border-b-0 sm:py-6"
            key={plan.planKey}
          >
            <div
              className={
                isMobileView
                  ? "grid gap-4"
                  : "grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(11rem,0.4fr)_minmax(11rem,0.4fr)] lg:items-start"
              }
            >
              <div className="grid gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">
                    {plan.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {plan.planType === "free" ? "Free plan" : "Paid plan"}
                  </span>
                </div>
                <p className="max-w-[42rem] text-sm leading-7 text-foreground/72 sm:text-base">
                  {plan.description}
                </p>
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                <div className="text-sm text-foreground/64">Monthly</div>
                <div className="text-2xl font-semibold tracking-tight">
                  {plan.pricing.month
                    ? getPlanPriceLabel(plan.pricing.month)
                    : "Not offered"}
                </div>
                <div className="text-sm text-foreground/64">
                  {plan.pricing.month ? "Billed monthly" : "No monthly price"}
                </div>
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                <div className="text-sm text-foreground/64">Yearly</div>
                <div className="text-2xl font-semibold tracking-tight">
                  {plan.pricing.year
                    ? getPlanPriceLabel(plan.pricing.year)
                    : "Not offered"}
                </div>
                <div className="text-sm text-foreground/64">
                  {plan.pricing.year ? "Billed yearly" : "No yearly price"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plan.features.map((feature) => (
                <div
                  className="flex gap-3 border-t border-border/60 pt-3"
                  key={feature.featureKey}
                >
                  <IconCheck
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-primary"
                  />
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <p className="text-sm leading-7 text-foreground/70">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function PricingComparisonDesktop({
  catalog,
}: {
  catalog: PricingCatalogResponse
}) {
  const featureGroups = buildPricingFeatureRows(catalog.plans)
  const gridTemplateColumns = `minmax(0, 22rem) repeat(${catalog.plans.length}, minmax(10rem, 1fr))`

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Feature comparison
        </h2>
        <p className="max-w-[22rem] text-sm leading-7 text-foreground/72 sm:max-w-[24rem] sm:text-base">
          A direct plan-by-plan view of what is currently included.
        </p>
      </div>

      <div className="overflow-x-auto border-y border-border/70">
        <div className="min-w-[64rem]">
          <div
            className="grid border-b border-border/70 py-4"
            style={{ gridTemplateColumns }}
          >
            <div className="pr-6 text-sm font-medium text-foreground/66">
              Included feature
            </div>
            {catalog.plans.map((plan) => (
              <div className="px-4 text-left" key={plan.planKey}>
                <div className="text-sm font-medium">{plan.name}</div>
                <div className="mt-1 text-xs text-foreground/64">
                  {plan.planType === "free" ? "Free" : "Paid"}
                </div>
              </div>
            ))}
          </div>

          {featureGroups.map((group) => (
            <div key={group.category}>
              <div className="border-b border-border/70 py-3 text-sm font-medium text-foreground">
                {group.category}
              </div>
              {group.rows.map((feature) => (
                <div
                  className="grid border-b border-border/70 py-4 last:border-b-0"
                  key={feature.featureKey}
                  style={{ gridTemplateColumns }}
                >
                  <div className="pr-6">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <div className="mt-1 text-sm leading-7 text-foreground/70">
                      {feature.description}
                    </div>
                  </div>

                  {catalog.plans.map((plan) => {
                    const isIncluded = plan.features.some(
                      (candidate) => candidate.featureKey === feature.featureKey
                    )

                    return (
                      <div
                        className="flex items-center gap-2 px-4 text-sm"
                        key={`${plan.planKey}:${feature.featureKey}`}
                      >
                        {isIncluded ? (
                          <>
                            <IconCheck
                              aria-hidden="true"
                              className="size-4 shrink-0 text-primary"
                            />
                            <span>Included</span>
                          </>
                        ) : (
                          <>
                            <IconMinus
                              aria-hidden="true"
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="text-foreground/62">Not included</span>
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
  const featureGroups = buildPricingFeatureRows(catalog.plans)

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Feature comparison</h2>
        <p className="text-sm leading-7 text-foreground/72">
          A stacked mobile view of what each plan includes.
        </p>
      </div>

      <div className="border-y border-border/70">
        {featureGroups.map((group) => (
          <section
            className="border-b border-border/70 py-5 last:border-b-0"
            key={group.category}
          >
            <h3 className="text-base font-semibold">{group.category}</h3>
            <div className="mt-4 grid gap-4">
              {group.rows.map((feature) => (
                <div
                  className="grid gap-3 border-t border-border/60 pt-3"
                  key={feature.featureKey}
                >
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <p className="text-sm leading-7 text-foreground/70">
                      {feature.description}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {catalog.plans.map((plan) => {
                      const isIncluded = plan.features.some(
                        (candidate) => candidate.featureKey === feature.featureKey
                      )

                      return (
                        <div
                          className="flex items-center justify-between gap-4 text-sm"
                          key={`${plan.planKey}:${feature.featureKey}`}
                        >
                          <span>{plan.name}</span>
                          <span
                            className={
                              isIncluded ? "text-foreground" : "text-muted-foreground"
                            }
                          >
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
