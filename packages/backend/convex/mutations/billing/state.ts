import { v } from "convex/values"

import type { Doc, Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { selectCurrentBillingSubscription } from "../../queries/billing/internal"

const billingIntervalValidator = v.union(v.literal("month"), v.literal("year"))
const subscriptionStatusValidator = v.union(
  v.literal("incomplete"),
  v.literal("trialing"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
  v.literal("paused"),
  v.literal("incomplete_expired")
)
const billingAttentionStatusValidator = v.union(
  v.literal("none"),
  v.literal("payment_failed"),
  v.literal("past_due"),
  v.literal("requires_action"),
  v.literal("paused")
)
const billingScheduledChangeTypeValidator = v.union(
  v.literal("cancel"),
  v.literal("plan_change")
)

type BillingCustomerPatch = Partial<
  Pick<
    Doc<"billingCustomers">,
    | "active"
    | "clerkUserId"
    | "email"
    | "name"
    | "stripeCustomerId"
    | "updatedAt"
    | "userId"
  >
>

type BillingSubscriptionPatch = Partial<
  Pick<
    Doc<"billingSubscriptions">,
    | "attentionStatus"
    | "attentionUpdatedAt"
    | "cancelAt"
    | "cancelAtPeriodEnd"
    | "canceledAt"
    | "clerkUserId"
    | "currentPeriodEnd"
    | "currentPeriodStart"
    | "endedAt"
    | "interval"
    | "lastStripeEventId"
    | "planKey"
    | "scheduledChangeAt"
    | "scheduledChangeRequestedAt"
    | "scheduledChangeType"
    | "scheduledInterval"
    | "scheduledPlanKey"
    | "status"
    | "stripeCustomerId"
    | "stripeLatestInvoiceId"
    | "stripeLatestPaymentIntentId"
    | "stripePriceId"
    | "stripeProductId"
    | "stripeScheduleId"
    | "stripeSubscriptionId"
    | "stripeSubscriptionItemId"
    | "updatedAt"
    | "userId"
  >
>

function hasChanged<T extends object>(patch: T) {
  return Object.keys(patch).length > 0
}

async function getExistingSubscriptionRecord(args: {
  ctx: MutationCtx
  stripeSubscriptionId: string
  userId: Id<"users">
}) {
  const existingByStripeSubscriptionId = await args.ctx.db
    .query("billingSubscriptions")
    .withIndex("by_stripeSubscriptionId", (query) =>
      query.eq("stripeSubscriptionId", args.stripeSubscriptionId)
    )
    .unique()

  if (existingByStripeSubscriptionId) {
    return existingByStripeSubscriptionId
  }

  const userSubscriptions = await args.ctx.db
    .query("billingSubscriptions")
    .withIndex("by_userId", (query) => query.eq("userId", args.userId))
    .collect()

  return selectCurrentBillingSubscription(userSubscriptions)
}

export const upsertBillingCustomer = internalMutation({
  args: {
    active: v.boolean(),
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    stripeCustomerId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existingByStripeCustomerId = await ctx.db
      .query("billingCustomers")
      .withIndex("by_stripeCustomerId", (query) =>
        query.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique()
    const existingByUserId = await ctx.db
      .query("billingCustomers")
      .withIndex("by_userId", (query) => query.eq("userId", args.userId))
      .unique()
    const existingCustomer = existingByStripeCustomerId ?? existingByUserId

    if (!existingCustomer) {
      return await ctx.db.insert("billingCustomers", {
        active: args.active,
        clerkUserId: args.clerkUserId,
        createdAt: now,
        email: args.email,
        name: args.name,
        stripeCustomerId: args.stripeCustomerId,
        updatedAt: now,
        userId: args.userId,
      })
    }

    const patch: BillingCustomerPatch = {}

    if (existingCustomer.active !== args.active) patch.active = args.active
    if (existingCustomer.clerkUserId !== args.clerkUserId) {
      patch.clerkUserId = args.clerkUserId
    }
    if ((existingCustomer.email ?? undefined) !== args.email) patch.email = args.email
    if ((existingCustomer.name ?? undefined) !== args.name) patch.name = args.name
    if (existingCustomer.stripeCustomerId !== args.stripeCustomerId) {
      patch.stripeCustomerId = args.stripeCustomerId
    }
    if (existingCustomer.userId !== args.userId) patch.userId = args.userId

    if (!hasChanged(patch)) {
      return existingCustomer._id
    }

    patch.updatedAt = now
    await ctx.db.patch(existingCustomer._id, patch)

    return existingCustomer._id
  },
})

export const upsertBillingSubscription = internalMutation({
  args: {
    attentionStatus: billingAttentionStatusValidator,
    attentionUpdatedAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    clerkUserId: v.string(),
    clearScheduledChange: v.optional(v.boolean()),
    currentPeriodEnd: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    interval: billingIntervalValidator,
    lastStripeEventId: v.optional(v.string()),
    planKey: v.string(),
    scheduledChangeAt: v.optional(v.number()),
    scheduledChangeRequestedAt: v.optional(v.number()),
    scheduledChangeType: v.optional(billingScheduledChangeTypeValidator),
    scheduledInterval: v.optional(billingIntervalValidator),
    scheduledPlanKey: v.optional(v.string()),
    status: subscriptionStatusValidator,
    stripeCustomerId: v.string(),
    stripeLatestInvoiceId: v.optional(v.string()),
    stripeLatestPaymentIntentId: v.optional(v.string()),
    stripePriceId: v.string(),
    stripeProductId: v.optional(v.string()),
    stripeScheduleId: v.optional(v.string()),
    stripeSubscriptionId: v.string(),
    stripeSubscriptionItemId: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existingSubscription = await getExistingSubscriptionRecord({
      ctx,
      stripeSubscriptionId: args.stripeSubscriptionId,
      userId: args.userId,
    })

    const scheduledFields =
      args.clearScheduledChange === true
        ? {
            scheduledChangeAt: undefined,
            scheduledChangeRequestedAt: undefined,
            scheduledChangeType: undefined,
            scheduledInterval: undefined,
            scheduledPlanKey: undefined,
          }
        : {
            scheduledChangeAt: args.scheduledChangeAt,
            scheduledChangeRequestedAt: args.scheduledChangeRequestedAt,
            scheduledChangeType: args.scheduledChangeType,
            scheduledInterval: args.scheduledInterval,
            scheduledPlanKey: args.scheduledPlanKey,
          }

    if (!existingSubscription) {
      return await ctx.db.insert("billingSubscriptions", {
        attentionStatus: args.attentionStatus,
        attentionUpdatedAt: args.attentionUpdatedAt,
        cancelAt: args.cancelAt,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        clerkUserId: args.clerkUserId,
        createdAt: now,
        currentPeriodEnd: args.currentPeriodEnd,
        currentPeriodStart: args.currentPeriodStart,
        endedAt: args.endedAt,
        interval: args.interval,
        lastStripeEventId: args.lastStripeEventId,
        planKey: args.planKey,
        status: args.status,
        stripeCustomerId: args.stripeCustomerId,
        stripeLatestInvoiceId: args.stripeLatestInvoiceId,
        stripeLatestPaymentIntentId: args.stripeLatestPaymentIntentId,
        stripePriceId: args.stripePriceId,
        stripeProductId: args.stripeProductId,
        stripeScheduleId: args.stripeScheduleId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeSubscriptionItemId: args.stripeSubscriptionItemId,
        updatedAt: now,
        userId: args.userId,
        ...scheduledFields,
      })
    }

    const patch: BillingSubscriptionPatch = {}

    if (existingSubscription.attentionStatus !== args.attentionStatus) {
      patch.attentionStatus = args.attentionStatus
    }
    if (
      (existingSubscription.attentionUpdatedAt ?? undefined) !==
      args.attentionUpdatedAt
    ) {
      patch.attentionUpdatedAt = args.attentionUpdatedAt
    }
    if ((existingSubscription.cancelAt ?? undefined) !== args.cancelAt) {
      patch.cancelAt = args.cancelAt
    }
    if (existingSubscription.cancelAtPeriodEnd !== args.cancelAtPeriodEnd) {
      patch.cancelAtPeriodEnd = args.cancelAtPeriodEnd
    }
    if ((existingSubscription.canceledAt ?? undefined) !== args.canceledAt) {
      patch.canceledAt = args.canceledAt
    }
    if (existingSubscription.clerkUserId !== args.clerkUserId) {
      patch.clerkUserId = args.clerkUserId
    }
    if (
      (existingSubscription.currentPeriodEnd ?? undefined) !==
      args.currentPeriodEnd
    ) {
      patch.currentPeriodEnd = args.currentPeriodEnd
    }
    if (
      (existingSubscription.currentPeriodStart ?? undefined) !==
      args.currentPeriodStart
    ) {
      patch.currentPeriodStart = args.currentPeriodStart
    }
    if ((existingSubscription.endedAt ?? undefined) !== args.endedAt) {
      patch.endedAt = args.endedAt
    }
    if (existingSubscription.interval !== args.interval) patch.interval = args.interval
    if (
      (existingSubscription.lastStripeEventId ?? undefined) !==
      args.lastStripeEventId
    ) {
      patch.lastStripeEventId = args.lastStripeEventId
    }
    if (existingSubscription.planKey !== args.planKey) patch.planKey = args.planKey
    if (
      (existingSubscription.scheduledChangeAt ?? undefined) !==
      scheduledFields.scheduledChangeAt
    ) {
      patch.scheduledChangeAt = scheduledFields.scheduledChangeAt
    }
    if (
      (existingSubscription.scheduledChangeRequestedAt ?? undefined) !==
      scheduledFields.scheduledChangeRequestedAt
    ) {
      patch.scheduledChangeRequestedAt = scheduledFields.scheduledChangeRequestedAt
    }
    if (
      (existingSubscription.scheduledChangeType ?? undefined) !==
      scheduledFields.scheduledChangeType
    ) {
      patch.scheduledChangeType = scheduledFields.scheduledChangeType
    }
    if (
      (existingSubscription.scheduledInterval ?? undefined) !==
      scheduledFields.scheduledInterval
    ) {
      patch.scheduledInterval = scheduledFields.scheduledInterval
    }
    if (
      (existingSubscription.scheduledPlanKey ?? undefined) !==
      scheduledFields.scheduledPlanKey
    ) {
      patch.scheduledPlanKey = scheduledFields.scheduledPlanKey
    }
    if (existingSubscription.status !== args.status) patch.status = args.status
    if (existingSubscription.stripeCustomerId !== args.stripeCustomerId) {
      patch.stripeCustomerId = args.stripeCustomerId
    }
    if (
      (existingSubscription.stripeLatestInvoiceId ?? undefined) !==
      args.stripeLatestInvoiceId
    ) {
      patch.stripeLatestInvoiceId = args.stripeLatestInvoiceId
    }
    if (
      (existingSubscription.stripeLatestPaymentIntentId ?? undefined) !==
      args.stripeLatestPaymentIntentId
    ) {
      patch.stripeLatestPaymentIntentId = args.stripeLatestPaymentIntentId
    }
    if (existingSubscription.stripePriceId !== args.stripePriceId) {
      patch.stripePriceId = args.stripePriceId
    }
    if (
      (existingSubscription.stripeProductId ?? undefined) !== args.stripeProductId
    ) {
      patch.stripeProductId = args.stripeProductId
    }
    if (
      (existingSubscription.stripeScheduleId ?? undefined) !== args.stripeScheduleId
    ) {
      patch.stripeScheduleId = args.stripeScheduleId
    }
    if (existingSubscription.stripeSubscriptionId !== args.stripeSubscriptionId) {
      patch.stripeSubscriptionId = args.stripeSubscriptionId
    }
    if (
      (existingSubscription.stripeSubscriptionItemId ?? undefined) !==
      args.stripeSubscriptionItemId
    ) {
      patch.stripeSubscriptionItemId = args.stripeSubscriptionItemId
    }
    if (existingSubscription.userId !== args.userId) patch.userId = args.userId

    if (!hasChanged(patch)) {
      return existingSubscription._id
    }

    patch.updatedAt = now
    await ctx.db.patch(existingSubscription._id, patch)

    return existingSubscription._id
  },
})

export const setSubscriptionScheduledChange = internalMutation({
  args: {
    scheduledChangeAt: v.number(),
    scheduledChangeRequestedAt: v.number(),
    scheduledChangeType: billingScheduledChangeTypeValidator,
    scheduledInterval: v.optional(billingIntervalValidator),
    scheduledPlanKey: v.optional(v.string()),
    stripeScheduleId: v.optional(v.string()),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_stripeSubscriptionId", (query) =>
        query.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique()

    if (!subscription) {
      throw new Error(
        `Billing subscription not found: ${args.stripeSubscriptionId}`
      )
    }

    await ctx.db.patch(subscription._id, {
      scheduledChangeAt: args.scheduledChangeAt,
      scheduledChangeRequestedAt: args.scheduledChangeRequestedAt,
      scheduledChangeType: args.scheduledChangeType,
      scheduledInterval: args.scheduledInterval,
      scheduledPlanKey: args.scheduledPlanKey,
      stripeScheduleId: args.stripeScheduleId,
      updatedAt: Date.now(),
    })

    return subscription._id
  },
})

export const clearSubscriptionScheduledChange = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_stripeSubscriptionId", (query) =>
        query.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique()

    if (!subscription) {
      return null
    }

    await ctx.db.patch(subscription._id, {
      scheduledChangeAt: undefined,
      scheduledChangeRequestedAt: undefined,
      scheduledChangeType: undefined,
      scheduledInterval: undefined,
      scheduledPlanKey: undefined,
      stripeScheduleId: undefined,
      updatedAt: Date.now(),
    })

    return subscription._id
  },
})

export const recordWebhookEventReceived = internalMutation({
  args: {
    customerId: v.optional(v.string()),
    eventType: v.string(),
    invoiceId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    safeSummary: v.string(),
    stripeEventId: v.string(),
    subscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_stripeEventId", (query) =>
        query.eq("stripeEventId", args.stripeEventId)
      )
      .unique()

    if (existingEvent) {
      return {
        alreadyExists: true,
        eventId: existingEvent._id,
        processingStatus: existingEvent.processingStatus,
      }
    }

    const now = Date.now()
    const eventId = await ctx.db.insert("billingWebhookEvents", {
      createdAt: now,
      customerId: args.customerId,
      errorMessage: undefined,
      eventType: args.eventType,
      invoiceId: args.invoiceId,
      paymentIntentId: args.paymentIntentId,
      processedAt: undefined,
      processingStatus: "received",
      receivedAt: now,
      safeSummary: args.safeSummary,
      stripeEventId: args.stripeEventId,
      subscriptionId: args.subscriptionId,
      updatedAt: now,
    })

    return {
      alreadyExists: false,
      eventId,
      processingStatus: "received" as const,
    }
  },
})

export const markWebhookEventProcessing = internalMutation({
  args: {
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_stripeEventId", (query) =>
        query.eq("stripeEventId", args.stripeEventId)
      )
      .unique()

    if (!existingEvent) {
      return null
    }

    if (
      existingEvent.processingStatus === "processed" ||
      existingEvent.processingStatus === "ignored"
    ) {
      return existingEvent._id
    }

    await ctx.db.patch(existingEvent._id, {
      processingStatus: "processing",
      updatedAt: Date.now(),
    })

    return existingEvent._id
  },
})

export const markWebhookEventProcessed = internalMutation({
  args: {
    processingStatus: v.union(v.literal("processed"), v.literal("ignored")),
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_stripeEventId", (query) =>
        query.eq("stripeEventId", args.stripeEventId)
      )
      .unique()

    if (!existingEvent) {
      return null
    }

    await ctx.db.patch(existingEvent._id, {
      errorMessage: undefined,
      processedAt: Date.now(),
      processingStatus: args.processingStatus,
      updatedAt: Date.now(),
    })

    return existingEvent._id
  },
})

export const markWebhookEventFailed = internalMutation({
  args: {
    errorMessage: v.string(),
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_stripeEventId", (query) =>
        query.eq("stripeEventId", args.stripeEventId)
      )
      .unique()

    if (!existingEvent) {
      return null
    }

    await ctx.db.patch(existingEvent._id, {
      errorMessage: args.errorMessage,
      processedAt: Date.now(),
      processingStatus: "failed",
      updatedAt: Date.now(),
    })

    return existingEvent._id
  },
})

export const grantBillingAccessGrant = internalMutation({
  args: {
    clerkUserId: v.string(),
    endsAt: v.optional(v.number()),
    grantedByClerkUserId: v.optional(v.string()),
    grantedByName: v.optional(v.string()),
    planKey: v.string(),
    reason: v.string(),
    source: v.union(
      v.literal("creator_approval"),
      v.literal("manual"),
      v.literal("promo")
    ),
    startsAt: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const grants = await ctx.db
      .query("billingAccessGrants")
      .withIndex("by_userId", (query) => query.eq("userId", args.userId))
      .collect()
    const activeGrantsForSource = grants.filter(
      (grant) => grant.active && grant.source === args.source
    )
    const matchingGrant = activeGrantsForSource.find(
      (grant) => grant.planKey === args.planKey
    )

    for (const grant of activeGrantsForSource) {
      if (matchingGrant?._id === grant._id) {
        continue
      }

      await ctx.db.patch(grant._id, {
        active: false,
        revokedAt: now,
        revokedByClerkUserId: args.grantedByClerkUserId,
        revokedByName: args.grantedByName,
        updatedAt: now,
      })
    }

    if (matchingGrant) {
      await ctx.db.patch(matchingGrant._id, {
        active: true,
        endsAt: args.endsAt,
        grantedByClerkUserId: args.grantedByClerkUserId,
        grantedByName: args.grantedByName,
        reason: args.reason,
        revokedAt: undefined,
        revokedByClerkUserId: undefined,
        revokedByName: undefined,
        startsAt: args.startsAt,
        updatedAt: now,
      })

      return matchingGrant._id
    }

    return await ctx.db.insert("billingAccessGrants", {
      active: true,
      clerkUserId: args.clerkUserId,
      createdAt: now,
      endsAt: args.endsAt,
      grantedByClerkUserId: args.grantedByClerkUserId,
      grantedByName: args.grantedByName,
      planKey: args.planKey,
      reason: args.reason,
      revokedAt: undefined,
      revokedByClerkUserId: undefined,
      revokedByName: undefined,
      source: args.source,
      startsAt: args.startsAt,
      updatedAt: now,
      userId: args.userId,
    })
  },
})

export const revokeBillingAccessGrant = internalMutation({
  args: {
    grantId: v.id("billingAccessGrants"),
    revokedByClerkUserId: v.optional(v.string()),
    revokedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.grantId)

    if (!grant) {
      return null
    }

    if (!grant.active) {
      return grant._id
    }

    await ctx.db.patch(grant._id, {
      active: false,
      revokedAt: Date.now(),
      revokedByClerkUserId: args.revokedByClerkUserId,
      revokedByName: args.revokedByName,
      updatedAt: Date.now(),
    })

    return grant._id
  },
})
