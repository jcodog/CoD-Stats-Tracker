import type { Doc } from "../../_generated/dataModel"
import { internalQuery } from "../../_generated/server"
import { v } from "convex/values"
import { getWebhookObjectIdsFromPayloadJson } from "../../../src/lib/stripe/billing"
import { resolveConfiguredUserRole } from "../../../src/lib/staffRoleConfig"

type UserRecord = Doc<"users">
type BillingPlanRecord = Doc<"billingPlans">
type BillingFeatureRecord = Doc<"billingFeatures">
type RankedTitleRecord = Doc<"rankedTitles">
type RankedModeRecord = Doc<"rankedModes">
type RankedMapRecord = Doc<"rankedMaps">

function sortUsers(left: UserRecord, right: UserRecord) {
  return left.name.localeCompare(right.name)
}

function sortBySortOrderAndKey<
  T extends BillingPlanRecord | BillingFeatureRecord,
>(left: T, right: T) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return left.key.localeCompare(right.key)
}

function sortRankedTitles(left: RankedTitleRecord, right: RankedTitleRecord) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return (
    left.label.localeCompare(right.label) || left.key.localeCompare(right.key)
  )
}

function sortRankedMaps(left: RankedMapRecord, right: RankedMapRecord) {
  if (left.titleKey !== right.titleKey) {
    return left.titleKey.localeCompare(right.titleKey)
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return left.name.localeCompare(right.name)
}

function sortRankedModes(left: RankedModeRecord, right: RankedModeRecord) {
  if (left.titleKey !== right.titleKey) {
    return left.titleKey.localeCompare(right.titleKey)
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return (
    left.label.localeCompare(right.label) || left.key.localeCompare(right.key)
  )
}

export const getUserByClerkUserId = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", args.clerkUserId)
      )
      .unique()
  },
})

export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect()
  },
})

export const getManagementRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [users, roleAuditLogs] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db
        .query("staffAuditLogs")
        .withIndex("by_entityType_createdAt", (query) =>
          query.eq("entityType", "user")
        )
        .order("desc")
        .take(75),
    ])

    return {
      roleAuditLogs,
      users: users.sort(sortUsers).map((user) => ({
        clerkUserId: user.clerkUserId,
        discordId: user.discordId,
        name: user.name,
        role:
          resolveConfiguredUserRole({
            discordId: user.discordId,
            role: user.role ?? null,
          }) ?? undefined,
        status: user.status,
      })),
    }
  },
})

export const getBillingRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [
      plans,
      features,
      planFeatures,
      subscriptions,
      customers,
      accessGrants,
      webhookEvents,
      users,
      auditLogs,
      creatorAccounts,
      creatorAttributions,
      creatorProgramDefaults,
    ] = await Promise.all([
      ctx.db.query("billingPlans").collect(),
      ctx.db.query("billingFeatures").collect(),
      ctx.db.query("billingPlanFeatures").collect(),
      ctx.db.query("billingSubscriptions").collect(),
      ctx.db.query("billingCustomers").collect(),
      ctx.db.query("billingAccessGrants").collect(),
      ctx.db
        .query("billingWebhookEvents")
        .withIndex("by_receivedAt")
        .order("desc")
        .take(200),
      ctx.db.query("users").collect(),
      ctx.db
        .query("staffAuditLogs")
        .withIndex("by_createdAt")
        .order("desc")
        .take(200),
      ctx.db.query("creatorAccounts").collect(),
      ctx.db.query("creatorAttributions").collect(),
      ctx.db
        .query("creatorProgramDefaults")
        .withIndex("by_key", (query) => query.eq("key", "global"))
        .unique(),
    ])

    return {
      auditLogs: auditLogs.filter((log) =>
        log.entityType.startsWith("billing")
      ),
      accessGrants,
      creatorAccounts,
      creatorAttributions,
      creatorProgramDefaults,
      customers,
      features: features.sort(sortBySortOrderAndKey),
      planFeatures,
      plans: plans.sort(sortBySortOrderAndKey),
      subscriptions: subscriptions.sort(
        (left, right) => right.updatedAt - left.updatedAt
      ),
      users: users.sort(sortUsers),
      webhookEvents,
    }
  },
})

export const getBillingWebhookLedgerRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const webhookEvents = await ctx.db
      .query("billingWebhookEvents")
      .withIndex("by_receivedAt")
      .order("desc")
      .collect()

    return webhookEvents.map((event) => ({
      ...(getWebhookObjectIdsFromPayloadJson(event.payloadJson) ?? {}),
      _id: event._id,
      customerId:
        event.customerId ??
        getWebhookObjectIdsFromPayloadJson(event.payloadJson)?.customerId,
      errorMessage: event.errorMessage,
      eventType: event.eventType,
      hasPayloadJson: event.payloadJson !== undefined,
      invoiceId:
        event.invoiceId ??
        getWebhookObjectIdsFromPayloadJson(event.payloadJson)?.invoiceId,
      paymentIntentId:
        event.paymentIntentId ??
        getWebhookObjectIdsFromPayloadJson(event.payloadJson)?.paymentIntentId,
      processedAt: event.processedAt,
      processingStatus: event.processingStatus,
      payloadUnavailableAt: event.payloadUnavailableAt,
      payloadUnavailableReason: event.payloadUnavailableReason,
      receivedAt: event.receivedAt,
      safeSummary: event.safeSummary,
      stripeEventId: event.stripeEventId,
      subscriptionId:
        event.subscriptionId ??
        getWebhookObjectIdsFromPayloadJson(event.payloadJson)?.subscriptionId,
    }))
  },
})

export const getBillingWebhookEventById = internalQuery({
  args: {
    eventId: v.id("billingWebhookEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)

    if (!event) {
      return null
    }

    const derivedObjectIds = getWebhookObjectIdsFromPayloadJson(
      event.payloadJson
    )

    return {
      _id: event._id,
      customerId: event.customerId ?? derivedObjectIds?.customerId,
      errorMessage: event.errorMessage,
      eventType: event.eventType,
      invoiceId: event.invoiceId ?? derivedObjectIds?.invoiceId,
      paymentIntentId:
        event.paymentIntentId ?? derivedObjectIds?.paymentIntentId,
      payloadJson: event.payloadJson,
      payloadUnavailableAt: event.payloadUnavailableAt,
      payloadUnavailableReason: event.payloadUnavailableReason,
      processedAt: event.processedAt,
      processingStatus: event.processingStatus,
      receivedAt: event.receivedAt,
      safeSummary: event.safeSummary,
      stripeEventId: event.stripeEventId,
      subscriptionId: event.subscriptionId ?? derivedObjectIds?.subscriptionId,
    }
  },
})

export const getOverviewRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [users, plans, features, subscriptions, auditLogs] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("billingPlans").collect(),
        ctx.db.query("billingFeatures").collect(),
        ctx.db.query("billingSubscriptions").collect(),
        ctx.db
          .query("staffAuditLogs")
          .withIndex("by_createdAt")
          .order("desc")
          .take(200),
      ])

    return {
      auditLogs,
      features: features.sort(sortBySortOrderAndKey),
      plans: plans.sort(sortBySortOrderAndKey),
      subscriptions: subscriptions.sort(
        (left, right) => right.updatedAt - left.updatedAt
      ),
      users: users.sort(sortUsers).map((user) => ({
        clerkUserId: user.clerkUserId,
        role:
          resolveConfiguredUserRole({
            discordId: user.discordId,
            role: user.role ?? null,
          }) ?? undefined,
        status: user.status,
      })),
    }
  },
})

export const getRankedRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [titles, modes, maps, config, openSessions] = await Promise.all([
      ctx.db.query("rankedTitles").collect(),
      ctx.db.query("rankedModes").collect(),
      ctx.db.query("rankedMaps").collect(),
      ctx.db
        .query("rankedConfigs")
        .withIndex("by_key", (query) => query.eq("key", "current"))
        .unique(),
      ctx.db
        .query("sessions")
        .withIndex("by_endedAt", (query) => query.eq("endedAt", null))
        .collect(),
    ])

    return {
      config,
      maps: maps.sort(sortRankedMaps),
      modes: modes.sort(sortRankedModes),
      openSessionCount: openSessions.length,
      titles: titles.sort(sortRankedTitles),
    }
  },
})
