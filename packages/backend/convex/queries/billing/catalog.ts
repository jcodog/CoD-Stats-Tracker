import { v } from "convex/values"
import type { Doc } from "../../_generated/dataModel"
import { internalQuery, query, type QueryCtx } from "../../_generated/server"
import { buildResolvedBillingState } from "./resolution"

export type BillingPlanRecord = Doc<"billingPlans">
export type BillingFeatureRecord = Doc<"billingFeatures">
export type BillingPlanFeatureRecord = Doc<"billingPlanFeatures">

export type BillingCatalogPlan = BillingPlanRecord & {
  features: BillingFeatureRecord[]
  missingFeatureKeys: string[]
  inactiveFeatureKeys: string[]
}

const SUPPORTED_CURRENCIES = ["GBP", "USD", "CAD", "EUR"] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]


export type PricingCatalog = {
  availableCurrencies: SupportedCurrency[]
  currentInterval: "month" | "year" | null | undefined
  currentPlanKey: string | null
  currencyNotice: string | null
  plans: PricingCatalogEntry[]
  selectedCurrency: SupportedCurrency
}

export type PricingCatalogEntry = {
  active: boolean
  description: string
  features: Array<{
    category: string | undefined
    description: string
    featureKey: string
    name: string
  }>
  name: string
  planKey: string
  planType: "free" | "paid"
  pricing: {
    month: {
      amount: number
      currency: string
      interval: "month"
    } | null
    year: {
      amount: number
      currency: string
      interval: "year"
    } | null
  }
  relationship: "checkout" | "current" | "downgrade" | "switch" | "upgrade"
  sortOrder: number
}

function getAvailableCurrencies(plans: BillingPlanRecord[]) {
  const activePaidPlans = plans.filter(
    (plan) => plan.active && plan.archivedAt === undefined && plan.planType === "paid"
  )

  if (activePaidPlans.length === 0) {
    return ["GBP"] as SupportedCurrency[]
  }

  return [...SUPPORTED_CURRENCIES]
}

function resolvePricingCurrency(args: {
  plans: BillingPlanRecord[]
  preferredCurrency?: string | null
}) {
  const availableCurrencies = getAvailableCurrencies(args.plans)

  return {
    availableCurrencies,
    currencyNotice: null,
    selectedCurrency: "GBP" as SupportedCurrency,
  }
}

function resolvePlanPricing<TInterval extends "month" | "year">(args: {
  interval: TInterval
  plan: BillingPlanRecord
  selectedCurrency: SupportedCurrency
}) {
  if (args.plan.planType !== "paid") {
    return null
  }

  const amount =
    args.interval === "month"
      ? args.plan.monthlyPriceAmount
      : args.plan.yearlyPriceAmount

  return amount > 0
    ? {
        amount,
        currency: "GBP",
        interval: args.interval,
      }
    : null
}

function getPlanRelationship(args: {
  currentPlan: BillingPlanRecord | null
  currentSubscriptionInterval?: "month" | "year"
  plan: BillingPlanRecord
}) {
  if (args.currentPlan?.key === args.plan.key) {
    return "current" as const
  }

  if (args.currentPlan === null) {
    return args.plan.planType === "paid" ? "checkout" as const : "current" as const
  }

  if (args.plan.planType !== "paid") {
    return "downgrade" as const
  }

  if (args.plan.sortOrder > args.currentPlan.sortOrder) {
    return "upgrade" as const
  }

  if (args.plan.sortOrder < args.currentPlan.sortOrder) {
    return "downgrade" as const
  }

  return "switch" as const
}

function sortBySortOrderAndKey<T extends { key: string; sortOrder: number }>(
  left: T,
  right: T
) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return left.key.localeCompare(right.key)
}

async function listBillingPlans(ctx: QueryCtx): Promise<BillingPlanRecord[]> {
  const plans = await ctx.db.query("billingPlans").collect()
  return plans.sort(sortBySortOrderAndKey)
}

async function listBillingFeatures(
  ctx: QueryCtx
): Promise<BillingFeatureRecord[]> {
  const features = await ctx.db.query("billingFeatures").collect()
  return features.sort(sortBySortOrderAndKey)
}

function collectPlanFeatures(args: {
  planKey: string
  mappings: BillingPlanFeatureRecord[]
  featuresByKey: Map<string, BillingFeatureRecord>
}) {
  const features: BillingFeatureRecord[] = []
  const missingFeatureKeys: string[] = []
  const inactiveFeatureKeys: string[] = []
  const seenFeatureKeys = new Set<string>()

  for (const mapping of args.mappings) {
    if (!mapping.enabled || seenFeatureKeys.has(mapping.featureKey)) {
      continue
    }

    seenFeatureKeys.add(mapping.featureKey)

    const feature = args.featuresByKey.get(mapping.featureKey)
    if (!feature) {
      missingFeatureKeys.push(mapping.featureKey)
      continue
    }

    if (!feature.active) {
      inactiveFeatureKeys.push(mapping.featureKey)
      continue
    }

    features.push(feature)
  }

  features.sort(sortBySortOrderAndKey)

  return {
    features,
    missingFeatureKeys,
    inactiveFeatureKeys,
  }
}

function buildPricingCatalog(args: {
  currentPlan: BillingPlanRecord | null
  currentSubscriptionInterval?: "month" | "year"
  features: BillingFeatureRecord[]
  planFeatures: BillingPlanFeatureRecord[]
  plans: BillingPlanRecord[]
  selectedCurrency: SupportedCurrency
}) {
  const featuresByKey = new Map(
    args.features.map((feature) => [feature.key, feature])
  )

  return args.plans
    .filter((plan) => plan.active && plan.archivedAt === undefined)
    .map((plan): PricingCatalogEntry => {
      const mappings = args.planFeatures.filter(
        (planFeature) => planFeature.planKey === plan.key
      )
      const { features } = collectPlanFeatures({
        planKey: plan.key,
        mappings,
        featuresByKey,
      })

      return {
        active: plan.active,
        description: plan.description,
        features: features.map((feature) => ({
          category: feature.category,
          description: feature.description,
          featureKey: feature.key,
          name: feature.name,
        })),
        name: plan.name,
        planKey: plan.key,
        planType: plan.planType,
        pricing: {
          month: resolvePlanPricing({
            interval: "month",
            plan,
            selectedCurrency: args.selectedCurrency,
          }),
          year: resolvePlanPricing({
            interval: "year",
            plan,
            selectedCurrency: args.selectedCurrency,
          }),
        },
        relationship: getPlanRelationship({
          currentPlan: args.currentPlan,
          currentSubscriptionInterval: args.currentSubscriptionInterval,
          plan,
        }),
        sortOrder: plan.sortOrder,
      }
    })
}

export const getBillingPlans = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await listBillingPlans(ctx)
  },
})

export const getBillingFeatures = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await listBillingFeatures(ctx)
  },
})

export const getPlanFeatures = internalQuery({
  args: {
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    const [mappings, features] = await Promise.all([
      ctx.db
        .query("billingPlanFeatures")
        .withIndex("by_planKey", (q) => q.eq("planKey", args.planKey))
        .collect(),
      listBillingFeatures(ctx),
    ])

    const featuresByKey = new Map(features.map((feature) => [feature.key, feature]))

    return collectPlanFeatures({
      planKey: args.planKey,
      mappings,
      featuresByKey,
    }).features
  },
})

export const getPricingCatalog = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [plans, planFeatures, features] = await Promise.all([
      listBillingPlans(ctx),
      ctx.db.query("billingPlanFeatures").collect(),
      listBillingFeatures(ctx),
    ])

    const featuresByKey = new Map(features.map((feature) => [feature.key, feature]))

    return plans.map((plan) => {
      const mappings = planFeatures.filter(
        (planFeature) => planFeature.planKey === plan.key
      )

      const { features, missingFeatureKeys, inactiveFeatureKeys } =
        collectPlanFeatures({
          planKey: plan.key,
          mappings,
          featuresByKey,
        })

      return {
        ...plan,
        features,
        missingFeatureKeys,
        inactiveFeatureKeys,
      }
    })
  },
})

export const getCustomerPricingCatalog = query({
  args: {
    preferredCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PricingCatalog> => {
    const [plans, planFeatures, features, identity] = await Promise.all([
      listBillingPlans(ctx),
      ctx.db.query("billingPlanFeatures").collect(),
      listBillingFeatures(ctx),
      ctx.auth.getUserIdentity(),
    ])
    const user = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerkUserId", (query) =>
            query.eq("clerkUserId", identity.subject)
          )
          .unique()
      : null
    const resolvedState = user ? await buildResolvedBillingState(ctx, user) : null
    const currentPlan = resolvedState?.effectivePlan ?? null
    const currentInterval = resolvedState?.subscription?.interval
    const pricingCurrency = resolvePricingCurrency({
      plans,
      preferredCurrency: args.preferredCurrency,
    })

    return {
      availableCurrencies: pricingCurrency.availableCurrencies,
      currentInterval,
      currentPlanKey: resolvedState?.effectivePlanKey ?? null,
      currencyNotice: pricingCurrency.currencyNotice,
      plans: buildPricingCatalog({
        currentPlan,
        currentSubscriptionInterval: currentInterval,
        features,
        planFeatures,
        plans,
        selectedCurrency: pricingCurrency.selectedCurrency,
      }),
      selectedCurrency: pricingCurrency.selectedCurrency,
    }
  },
})

export const getCustomerPricingCatalogInternal = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args): Promise<PricingCatalog> => {
    const [plans, planFeatures, features, user] = await Promise.all([
      listBillingPlans(ctx),
      ctx.db.query("billingPlanFeatures").collect(),
      listBillingFeatures(ctx),
      ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (query) =>
          query.eq("clerkUserId", args.clerkUserId)
        )
        .unique(),
    ])
    const resolvedState = user ? await buildResolvedBillingState(ctx, user) : null
    const currentPlan = resolvedState?.effectivePlan ?? null
    const currentInterval = resolvedState?.subscription?.interval
    const pricingCurrency = resolvePricingCurrency({
      plans,
    })

    return {
      availableCurrencies: pricingCurrency.availableCurrencies,
      currentInterval,
      currentPlanKey: resolvedState?.effectivePlanKey ?? null,
      currencyNotice: pricingCurrency.currencyNotice,
      plans: buildPricingCatalog({
        currentPlan,
        currentSubscriptionInterval: currentInterval,
        features,
        planFeatures,
        plans,
        selectedCurrency: pricingCurrency.selectedCurrency,
      }),
      selectedCurrency: pricingCurrency.selectedCurrency,
    }
  },
})

export const getPublicPricingCatalogInternal = internalQuery({
  args: {
    preferredCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PricingCatalog> => {
    const [plans, planFeatures, features] = await Promise.all([
      listBillingPlans(ctx),
      ctx.db.query("billingPlanFeatures").collect(),
      listBillingFeatures(ctx),
    ])
    const pricingCurrency = resolvePricingCurrency({
      plans,
      preferredCurrency: args.preferredCurrency,
    })

    return {
      availableCurrencies: pricingCurrency.availableCurrencies,
      currentInterval: null,
      currentPlanKey: null,
      currencyNotice: pricingCurrency.currencyNotice,
      plans: buildPricingCatalog({
        currentPlan: null,
        features,
        planFeatures,
        plans,
        selectedCurrency: pricingCurrency.selectedCurrency,
      }),
      selectedCurrency: pricingCurrency.selectedCurrency,
    }
  },
})

export const getPublicPricingCatalog = query({
  args: {
    preferredCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PricingCatalog> => {
    const [plans, planFeatures, features] = await Promise.all([
      listBillingPlans(ctx),
      ctx.db.query("billingPlanFeatures").collect(),
      listBillingFeatures(ctx),
    ])
    const pricingCurrency = resolvePricingCurrency({
      plans,
      preferredCurrency: args.preferredCurrency,
    })

    return {
      availableCurrencies: pricingCurrency.availableCurrencies,
      currentInterval: null,
      currentPlanKey: null,
      currencyNotice: pricingCurrency.currencyNotice,
      plans: buildPricingCatalog({
        currentPlan: null,
        features,
        planFeatures,
        plans,
        selectedCurrency: pricingCurrency.selectedCurrency,
      }),
      selectedCurrency: pricingCurrency.selectedCurrency,
    }
  },
})
