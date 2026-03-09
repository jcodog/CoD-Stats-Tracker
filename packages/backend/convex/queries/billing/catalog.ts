import { v } from "convex/values"
import type { Doc } from "../../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../../_generated/server"

export type BillingPlanRecord = Doc<"billingPlans">
export type BillingFeatureRecord = Doc<"billingFeatures">
export type BillingPlanFeatureRecord = Doc<"billingPlanFeatures">

export type BillingCatalogPlan = BillingPlanRecord & {
  features: BillingFeatureRecord[]
  missingFeatureKeys: string[]
  inactiveFeatureKeys: string[]
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
