import { v } from "convex/values"

import type { Doc } from "../../_generated/dataModel"
import {
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server"
import {
  hasEffectivePaidSubscriptionAccess,
  hasManagedCreatorGrantSubscriptionAccess,
  type BillingAccessSource,
  type BillingAttentionStatus,
} from "../../../src/lib/billing"
import { resolveAppPlanKey } from "../../../src/lib/billingAccess"
import { resolveBillingFeatureApplyMode } from "../../../src/lib/staffRoles"
import {
  selectCurrentBillingAccessGrant,
  selectCurrentManagedCreatorGrantSubscription,
  selectCurrentBillingSubscription,
} from "./internal"

type BillingFeatureRecord = Doc<"billingFeatures">
type BillingEntitlementRecord = Doc<"billingEntitlements">
type BillingSubscriptionRecord = Doc<"billingSubscriptions">
type UserRecord = Doc<"users">

function sortFeatures(left: BillingFeatureRecord, right: BillingFeatureRecord) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return left.key.localeCompare(right.key)
}

function isEntitlementCurrentlyApplicable(
  entitlement: BillingEntitlementRecord,
  now: number
) {
  if (entitlement.startsAt !== undefined && entitlement.startsAt > now) {
    return false
  }

  if (entitlement.endsAt !== undefined && entitlement.endsAt <= now) {
    return false
  }

  return true
}

async function getResolvedPlanFeatureKeys(args: {
  ctx: Pick<QueryCtx, "db">
  features: BillingFeatureRecord[]
  planKey: string | null
}) {
  if (!args.planKey) {
    return new Set<string>()
  }

  const featureModeByKey = new Map(
    args.features.map((feature) => [
      feature.key,
      resolveBillingFeatureApplyMode(feature.appliesTo),
    ])
  )
  const mappings = await args.ctx.db
    .query("billingPlanFeatures")
    .withIndex("by_planKey", (query) => query.eq("planKey", args.planKey!))
    .collect()

  return new Set(
    mappings
      .filter(
        (mapping) =>
          mapping.enabled &&
          featureModeByKey.get(mapping.featureKey) !== "marketing"
      )
      .map((mapping) => mapping.featureKey)
  )
}

function deriveAttentionStatus(
  subscription: BillingSubscriptionRecord | null
): BillingAttentionStatus {
  if (!subscription) {
    return "none"
  }

  if (subscription.attentionStatus !== "none") {
    return subscription.attentionStatus
  }

  if (subscription.status === "past_due") {
    return "past_due"
  }

  if (subscription.status === "paused") {
    return "paused"
  }

  return "none"
}

function deriveUpcomingChange(subscription: BillingSubscriptionRecord | null) {
  if (!subscription) {
    return null
  }

  if (
    subscription.scheduledChangeType === "plan_change" &&
    subscription.scheduledPlanKey &&
    subscription.scheduledInterval &&
    subscription.scheduledChangeAt
  ) {
    return {
      effectiveAt: subscription.scheduledChangeAt,
      interval: subscription.scheduledInterval,
      planKey: subscription.scheduledPlanKey,
      type: "plan_change" as const,
    }
  }

  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return {
      effectiveAt: subscription.currentPeriodEnd,
      interval: subscription.interval,
      planKey: subscription.planKey,
      type: "cancel" as const,
    }
  }

  return null
}

export async function buildResolvedBillingState(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  user: UserRecord
) {
  const now = Date.now()
  const [customer, subscriptions, grants, entitlements, features, plans] =
    await Promise.all([
      ctx.db
        .query("billingCustomers")
        .withIndex("by_userId", (query) => query.eq("userId", user._id))
        .unique(),
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_userId", (query) => query.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("billingAccessGrants")
        .withIndex("by_userId", (query) => query.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("billingEntitlements")
        .withIndex("by_userId", (query) => query.eq("userId", user._id))
        .collect(),
      ctx.db.query("billingFeatures").collect(),
      ctx.db.query("billingPlans").collect(),
    ])

  const subscription = selectCurrentBillingSubscription(subscriptions, now)
  const managedGrantSubscription = selectCurrentManagedCreatorGrantSubscription(
    subscriptions,
    now
  )
  const accessGrant = selectCurrentBillingAccessGrant(grants, now)
  const paidSubscriptionEligible =
    subscription !== null &&
    hasEffectivePaidSubscriptionAccess(subscription, now)
  const managedGrantEligible =
    managedGrantSubscription !== null &&
    hasManagedCreatorGrantSubscriptionAccess(managedGrantSubscription, now)
  const hasLegacyPlanFallback =
    Boolean(user.plan) &&
    customer === null &&
    subscriptions.length === 0 &&
    grants.length === 0
  const effectivePlanKey =
    (managedGrantEligible ? managedGrantSubscription?.planKey : undefined) ??
    accessGrant?.planKey ??
    (paidSubscriptionEligible ? subscription?.planKey : undefined) ??
    (hasLegacyPlanFallback ? user.plan : undefined) ??
    null
  const accessSource: BillingAccessSource = managedGrantEligible
    ? "managed_grant_subscription"
    : accessGrant !== null
      ? "creator_grant"
      : paidSubscriptionEligible
        ? "paid_subscription"
        : hasLegacyPlanFallback
          ? "legacy_plan"
          : "none"
  const featureKeys = await getResolvedPlanFeatureKeys({
    ctx,
    features,
    planKey: effectivePlanKey,
  })
  const activeFeaturesByKey = new Map(
    features
      .filter(
        (feature) =>
          feature.active &&
          resolveBillingFeatureApplyMode(feature.appliesTo) !== "marketing"
      )
      .map((feature) => [feature.key, feature])
  )
  const applicableEntitlements = entitlements
    .filter((entitlement) => isEntitlementCurrentlyApplicable(entitlement, now))
    .sort(
      (left, right) =>
        right.updatedAt - left.updatedAt ||
        right._creationTime - left._creationTime
    )
  const handledEntitlementKeys = new Set<string>()

  for (const entitlement of applicableEntitlements) {
    if (
      handledEntitlementKeys.has(entitlement.featureKey) ||
      !activeFeaturesByKey.has(entitlement.featureKey)
    ) {
      continue
    }

    handledEntitlementKeys.add(entitlement.featureKey)

    if (entitlement.enabled) {
      featureKeys.add(entitlement.featureKey)
      continue
    }

    featureKeys.delete(entitlement.featureKey)
  }

  const effectiveFeatures = Array.from(featureKeys)
    .map((featureKey) => activeFeaturesByKey.get(featureKey))
    .filter((feature): feature is BillingFeatureRecord => feature !== undefined)
    .sort(sortFeatures)
  const plansByKey = new Map(plans.map((plan) => [plan.key, plan]))
  const effectivePlan =
    (effectivePlanKey ? plansByKey.get(effectivePlanKey) : null) ?? null
  const creatorGrant =
    accessGrant && accessGrant.source === "creator_approval"
      ? accessGrant
      : null
  const appPlanKey = resolveAppPlanKey({
    accessSource,
    effectivePlan,
    effectivePlanKey,
    fallbackPlanKey: hasLegacyPlanFallback ? user.plan : undefined,
    grantSource: accessGrant?.source,
    managedGrantSource: managedGrantSubscription?.managedGrantSource,
  })
  const hasCreatorAccess = appPlanKey === "creator"

  return {
    accessGrant,
    accessSource,
    appPlanKey,
    attentionStatus: deriveAttentionStatus(
      managedGrantEligible ? managedGrantSubscription : subscription
    ),
    creatorGrant,
    customer,
    effectiveFeatures,
    effectivePlan,
    effectivePlanKey,
    hasActiveAccess: appPlanKey !== "free",
    hasCreatorAccess,
    subscription: managedGrantEligible
      ? managedGrantSubscription
      : subscription,
    upcomingChange: deriveUpcomingChange(
      managedGrantEligible ? managedGrantSubscription : subscription
    ),
    user,
  }
}

export const resolveUserPlanState = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      return null
    }

    return await buildResolvedBillingState(ctx, user)
  },
})

export const resolveUserEntitlements = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      return []
    }

    return (await buildResolvedBillingState(ctx, user)).effectiveFeatures
  },
})

export const getCurrentUserResolvedBillingState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!user) {
      return null
    }

    return await buildResolvedBillingState(ctx, user)
  },
})
