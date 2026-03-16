import { v } from "convex/values"
import type { Doc } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"

type BillingPlanStripePatch = Partial<
  Pick<
    Doc<"billingPlans">,
    "stripeProductId" | "monthlyPriceId" | "yearlyPriceId" | "updatedAt"
  >
>

type BillingFeatureStripePatch = Partial<
  Pick<Doc<"billingFeatures">, "stripeFeatureId" | "updatedAt">
>

export const updatePlanStripeIds = internalMutation({
  args: {
    planKey: v.string(),
    stripeProductId: v.optional(v.string()),
    monthlyPriceId: v.optional(v.string()),
    yearlyPriceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("billingPlans")
      .withIndex("by_key", (q) => q.eq("key", args.planKey))
      .unique()

    if (!plan) {
      throw new Error(`Billing plan not found: ${args.planKey}`)
    }

    const patch: BillingPlanStripePatch = {}

    if (
      args.stripeProductId !== undefined &&
      plan.stripeProductId !== args.stripeProductId
    ) {
      patch.stripeProductId = args.stripeProductId
    }

    if (
      args.monthlyPriceId !== undefined &&
      plan.monthlyPriceId !== args.monthlyPriceId
    ) {
      patch.monthlyPriceId = args.monthlyPriceId
    }

    if (
      args.yearlyPriceId !== undefined &&
      plan.yearlyPriceId !== args.yearlyPriceId
    ) {
      patch.yearlyPriceId = args.yearlyPriceId
    }

    if (Object.keys(patch).length === 0) {
      return { updated: false }
    }

    patch.updatedAt = Date.now()

    await ctx.db.patch(plan._id, patch)

    return { updated: true }
  },
})

export const updateFeatureStripeId = internalMutation({
  args: {
    featureKey: v.string(),
    stripeFeatureId: v.string(),
  },
  handler: async (ctx, args) => {
    const feature = await ctx.db
      .query("billingFeatures")
      .withIndex("by_key", (q) => q.eq("key", args.featureKey))
      .unique()

    if (!feature) {
      throw new Error(`Billing feature not found: ${args.featureKey}`)
    }

    if (feature.stripeFeatureId === args.stripeFeatureId) {
      return { updated: false }
    }

    const patch: BillingFeatureStripePatch = {
      stripeFeatureId: args.stripeFeatureId,
      updatedAt: Date.now(),
    }

    await ctx.db.patch(feature._id, patch)

    return { updated: true }
  },
})
