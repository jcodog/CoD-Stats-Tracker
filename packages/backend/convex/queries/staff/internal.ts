import { staffBillingScopeValidator } from "../../../src/lib/staffBillingScope"
import type { Doc, TableNames } from "../../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../../_generated/server"
import { v } from "convex/values"
import { paginationOptsValidator } from "convex/server"
import { emptyStaffMetrics } from "../../../src/lib/staffMetrics"
import { getWebhookObjectIdsFromPayloadJson } from "../../../src/lib/stripe/billing"
import { resolveConfiguredUserRole } from "../../../src/lib/staffRoleConfig"

type BillingPlanRecord = Doc<"billingPlans">
type BillingFeatureRecord = Doc<"billingFeatures">
type RankedTitleRecord = Doc<"rankedTitles">
type RankedModeRecord = Doc<"rankedModes">
type RankedMapRecord = Doc<"rankedMaps">

const payoutTransferStatusValidator = v.union(
  v.literal("cancelled"),
  v.literal("draft"),
  v.literal("failed"),
  v.literal("requires_review"),
  v.literal("transferred"),
  v.literal("transferring")
)

const payoutRunStatusValidator = v.union(
  v.literal("canceled"),
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("draft"),
  v.literal("failed"),
  v.literal("executing"),
  v.literal("partial_failed"),
  v.literal("partially_transferred"),
  v.literal("processing"),
  v.literal("requires_review"),
  v.literal("transferred")
)

async function listEligibleCreatorPayoutLedgerRows(
  ctx: QueryCtx,
  args: {
    creatorPayoutPeriodEnd?: number
    creatorPayoutPeriodStart?: number
  }
) {
  // Payout previews are intentionally bounded and period-scoped for the staff
  // dashboard. TODO: add cursor pagination before exposing full ledger history.
  if (
    args.creatorPayoutPeriodStart !== undefined &&
    args.creatorPayoutPeriodEnd !== undefined
  ) {
    const periodStart = args.creatorPayoutPeriodStart
    const periodEnd = args.creatorPayoutPeriodEnd

    const rows = await ctx.db
      .query("creatorEarningLedger")
      .withIndex("by_status_invoiceIssuedAt", (query) =>
        query
          .eq("status", "eligible")
          .gte("invoiceIssuedAt", periodStart)
          .lte("invoiceIssuedAt", periodEnd)
      )
      .take(5001)
    if (rows.length > 5000)
      throw new Error(
        "Too many eligible ledger rows. Choose a narrower payout period or explicit entries."
      )
    return rows
  }

  const rows = await ctx.db
    .query("creatorEarningLedger")
    .withIndex("by_status", (query) => query.eq("status", "eligible"))
    .take(5001)
  if (rows.length > 5000)
    throw new Error(
      "Too many eligible ledger rows. Choose a narrower payout period or explicit entries."
    )
  return rows
}

async function listCreatorPayoutTransfersForDashboard(
  ctx: QueryCtx,
  args: {
    creatorPayoutTransferStatus?: Doc<"creatorPayoutTransfers">["status"]
  }
) {
  // Dashboard transfer history loads the latest operational slice only.
  // TODO: replace the fixed cap with cursor pagination for deep audit browsing.
  if (args.creatorPayoutTransferStatus) {
    const status = args.creatorPayoutTransferStatus

    return await ctx.db
      .query("creatorPayoutTransfers")
      .withIndex("by_status_updatedAt", (query) => query.eq("status", status))
      .order("desc")
      .take(100)
  }

  return await ctx.db
    .query("creatorPayoutTransfers")
    .withIndex("by_updatedAt")
    .order("desc")
    .take(100)
}

async function listCreatorPayoutRunsForDashboard(
  ctx: QueryCtx,
  args: {
    creatorPayoutRunCreatedAfter?: number
    creatorPayoutRunCreatedBefore?: number
    creatorPayoutRunStatus?: Doc<"creatorPayoutRuns">["status"]
  }
) {
  // Run history is indexed by status/date and capped for initial dashboard load.
  // TODO: add cursor pagination when staff need multi-period archive browsing.
  if (args.creatorPayoutRunStatus) {
    const status = args.creatorPayoutRunStatus

    return await ctx.db
      .query("creatorPayoutRuns")
      .withIndex("by_status_createdAt", (query) => {
        const scoped = query.eq("status", status)

        if (
          args.creatorPayoutRunCreatedAfter !== undefined &&
          args.creatorPayoutRunCreatedBefore !== undefined
        ) {
          return scoped
            .gte("createdAt", args.creatorPayoutRunCreatedAfter)
            .lte("createdAt", args.creatorPayoutRunCreatedBefore)
        }

        return scoped
      })
      .order("desc")
      .take(50)
  }

  if (
    args.creatorPayoutRunCreatedAfter !== undefined &&
    args.creatorPayoutRunCreatedBefore !== undefined
  ) {
    const createdAfter = args.creatorPayoutRunCreatedAfter
    const createdBefore = args.creatorPayoutRunCreatedBefore

    return await ctx.db
      .query("creatorPayoutRuns")
      .withIndex("by_createdAt", (query) =>
        query.gte("createdAt", createdAfter).lte("createdAt", createdBefore)
      )
      .order("desc")
      .take(50)
  }

  return await ctx.db
    .query("creatorPayoutRuns")
    .withIndex("by_createdAt")
    .order("desc")
    .take(50)
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

export const getManagementRecords = internalQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    clerkUserIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.clerkUserIds && args.clerkUserIds.length > 50)
      throw new Error("Directory pages are limited to 50 users.")
    const roleAuditLogs = await ctx.db
      .query("staffAuditLogs")
      .withIndex("by_entityType_createdAt", (q) => q.eq("entityType", "user"))
      .order("desc")
      .take(75)
    if (args.clerkUserIds) {
      const users = await Promise.all(
        args.clerkUserIds.map((clerkUserId) =>
          ctx.db
            .query("users")
            .withIndex("by_clerkUserId", (q) =>
              q.eq("clerkUserId", clerkUserId)
            )
            .unique()
        )
      )
      return {
        roleAuditLogs,
        users: users.filter((user): user is Doc<"users"> => user !== null),
        continueCursor: null,
      }
    }
    const result = await ctx.db
      .query("users")
      .order("desc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: 50,
        maximumRowsRead: 50,
      })
    return {
      roleAuditLogs,
      users: result.page,
      continueCursor: result.isDone ? null : result.continueCursor,
    }
  },
})
export const getBillingCatalogRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [plans, features, planFeatures] = await Promise.all([
      ctx.db.query("billingPlans").collect(),
      ctx.db.query("billingFeatures").collect(),
      ctx.db.query("billingPlanFeatures").collect(),
    ])
    return { plans, features, planFeatures }
  },
})

export const getCreatorPayoutPreviewRecords = internalQuery({
  args: {
    creatorPayoutPeriodEnd: v.optional(v.number()),
    creatorPayoutPeriodStart: v.optional(v.number()),
    ledgerEntryIds: v.optional(v.array(v.id("creatorEarningLedger"))),
  },
  handler: async (ctx, args) => {
    if (args.ledgerEntryIds && args.ledgerEntryIds.length > 500)
      throw new Error("Select at most 500 ledger entries per preview.")
    const selectedRows = args.ledgerEntryIds
      ? await Promise.all(
          [...new Set(args.ledgerEntryIds)].map((id) => ctx.db.get(id))
        )
      : await listEligibleCreatorPayoutLedgerRows(ctx, args)
    const creatorEarningLedger = selectedRows.filter(
      (row): row is Doc<"creatorEarningLedger"> => row !== null
    )
    const accounts = await Promise.all(
      [...new Set(creatorEarningLedger.map((row) => row.creatorAccountId))].map(
        (id) => ctx.db.get(id)
      )
    )
    return {
      creatorEarningLedger,
      creatorAccounts: accounts.filter(
        (account): account is Doc<"creatorAccounts"> => account !== null
      ),
    }
  },
})
export const getBillingContextRecords = internalQuery({
  args: {
    includePayouts: v.optional(v.boolean()),
    creatorPayoutPeriodEnd: v.optional(v.number()),
    creatorPayoutPeriodStart: v.optional(v.number()),
    creatorPayoutRunCreatedAfter: v.optional(v.number()),
    creatorPayoutRunCreatedBefore: v.optional(v.number()),
    creatorPayoutRunStatus: v.optional(payoutRunStatusValidator),
    creatorPayoutTransferStatus: v.optional(payoutTransferStatusValidator),
  },
  handler: async (ctx, args) => {
    const [
      plans,
      features,
      planFeatures,
      webhookEvents,
      auditLogs,
      creatorEarningLedger,
      creatorPayoutRuns,
      creatorPayoutTransfers,
      creatorProgramDefaults,
    ] = await Promise.all([
      ctx.db.query("billingPlans").collect(),
      ctx.db.query("billingFeatures").collect(),
      ctx.db.query("billingPlanFeatures").collect(),
      ctx.db
        .query("billingWebhookEvents")
        .withIndex("by_receivedAt")
        .order("desc")
        .take(200),
      ctx.db
        .query("staffAuditLogs")
        .withIndex("by_createdAt")
        .order("desc")
        .take(200),
      args.includePayouts === false
        ? []
        : listEligibleCreatorPayoutLedgerRows(ctx, args),
      args.includePayouts === false
        ? []
        : listCreatorPayoutRunsForDashboard(ctx, args),
      args.includePayouts === false
        ? []
        : listCreatorPayoutTransfersForDashboard(ctx, args),
      ctx.db
        .query("creatorProgramDefaults")
        .withIndex("by_key", (query) => query.eq("key", "global"))
        .unique(),
    ])

    return {
      auditLogs: auditLogs.filter((log) =>
        log.entityType.startsWith("billing")
      ),
      creatorEarningLedger,
      creatorPayoutRuns,
      creatorPayoutTransfers,
      creatorProgramDefaults,
      features: features.sort(sortBySortOrderAndKey),
      planFeatures,
      plans: plans.sort(sortBySortOrderAndKey),
      webhookEvents,
    }
  },
})

export const getCreatorPayoutRunById = internalQuery({
  args: {
    payoutRunId: v.id("creatorPayoutRuns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.payoutRunId)
  },
})

export const findCreatorPayoutRunByPeriodStartAndSource = internalQuery({
  args: {
    periodStart: v.number(),
    source: v.union(
      v.literal("dry_run_review"),
      v.literal("manual"),
      v.literal("scheduled")
    ),
  },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("creatorPayoutRuns")
      .withIndex("by_periodStart", (query) =>
        query.eq("periodStart", args.periodStart)
      )
      .collect()

    return (
      runs.find(
        (run) =>
          run.source === args.source &&
          run.status !== "canceled" &&
          run.status !== "cancelled"
      ) ?? null
    )
  },
})

export const getCreatorPayoutTransferById = internalQuery({
  args: {
    payoutTransferId: v.id("creatorPayoutTransfers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.payoutTransferId)
  },
})

export const listCreatorPayoutTransfersByRunId = internalQuery({
  args: {
    payoutRunId: v.id("creatorPayoutRuns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("creatorPayoutTransfers")
      .withIndex("by_payoutRunId", (query) =>
        query.eq("payoutRunId", args.payoutRunId)
      )
      .collect()
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
    const [plans, features, auditLogs] = await Promise.all([
      ctx.db.query("billingPlans").collect(),
      ctx.db.query("billingFeatures").collect(),
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
    }
  },
})

export const getOverviewMetricsPage = internalQuery({
  args: {
    kind: v.union(v.literal("users"), v.literal("subscriptions")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const totals = emptyStaffMetrics()
    const options = {
      ...args.paginationOpts,
      numItems: Math.min(args.paginationOpts.numItems, 200),
      maximumRowsRead: 200,
      maximumBytesRead: 256_000,
    }
    if (args.kind === "users") {
      const result = await ctx.db.query("users").paginate(options)
      for (const user of result.page) {
        totals.trackedUsers += 1
        const role = resolveConfiguredUserRole({
          role: user.role ?? null,
          discordId: user.discordId,
        })
        if (role === "admin") totals.adminUsers += 1
        if (role === "staff") totals.staffUsers += 1
        if (role === "super_admin") totals.superAdminUsers += 1
      }
      return {
        totals,
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      }
    }
    const result = await ctx.db.query("billingSubscriptions").paginate(options)
    for (const subscription of result.page) {
      const status = subscription.status
      if (
        status !== "active" &&
        status !== "trialing" &&
        status !== "past_due" &&
        status !== "paused"
      )
        continue
      totals[status] += 1
      if (status === "active" || status === "trialing")
        totals.activeSubscriptions += 1
      if (
        status === "past_due" ||
        status === "paused" ||
        subscription.cancelAtPeriodEnd
      )
        totals.attentionSubscriptions += 1
      if (subscription.cancelAtPeriodEnd) totals.cancelAtPeriodEndCount += 1
    }
    return {
      totals,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})
export const getRankedRecords = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [titles, modes, maps, config] = await Promise.all([
      ctx.db.query("rankedTitles").collect(),
      ctx.db.query("rankedModes").collect(),
      ctx.db.query("rankedMaps").collect(),
      ctx.db
        .query("rankedConfigs")
        .withIndex("by_key", (query) => query.eq("key", "current"))
        .unique(),
    ])

    return {
      config,
      maps: maps.sort(sortRankedMaps),
      modes: modes.sort(sortRankedModes),
      titles: titles.sort(sortRankedTitles),
    }
  },
})

function paginatedBillingTable<Table extends TableNames>(table: Table) {
  return internalQuery({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) =>
      ctx.db.query(table).paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 200),
        maximumRowsRead: 200,
        maximumBytesRead: 256_000,
      }),
  })
}

export const getBillingSubscriptionsPage = paginatedBillingTable(
  "billingSubscriptions"
)
export const getBillingCustomersPage = paginatedBillingTable("billingCustomers")
export const getBillingAccessGrantsPage = paginatedBillingTable(
  "billingAccessGrants"
)
export const getBillingUsersPage = paginatedBillingTable("users")
export const getBillingCreatorAccountsPage =
  paginatedBillingTable("creatorAccounts")
export const getBillingCreatorAttributionsPage = paginatedBillingTable(
  "creatorAttributions"
)

export const getOpenSessionCountPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("sessions")
      .withIndex("by_endedAt", (query) => query.eq("endedAt", null))
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 200),
        maximumRowsRead: 200,
        maximumBytesRead: 256_000,
      })
    return {
      count: result.page.length,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})
export const getBillingSectionRecords = internalQuery({
  args: {
    scope: staffBillingScopeValidator,
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const options = {
      cursor: args.cursor,
      numItems: 25,
      maximumRowsRead: 25,
      maximumBytesRead: 128_000,
    }
    let continueCursor: string | null = null
    const userIds = new Set<Doc<"users">["_id"]>()
    let primarySubscriptions: Doc<"billingSubscriptions">[] = []
    let primaryCustomers: Doc<"billingCustomers">[] = []
    let creatorAccounts: Doc<"creatorAccounts">[] = []
    if (args.scope === "subscriptions") {
      const page = await ctx.db
        .query("billingSubscriptions")
        .order("desc")
        .paginate(options)
      primarySubscriptions = page.page
      for (const row of page.page) userIds.add(row.userId)
      continueCursor = page.isDone ? null : page.continueCursor
    } else if (args.scope === "customers") {
      const page = await ctx.db
        .query("billingCustomers")
        .order("desc")
        .paginate(options)
      primaryCustomers = page.page
      for (const row of page.page) userIds.add(row.userId)
      continueCursor = page.isDone ? null : page.continueCursor
    } else if (args.scope === "creator-program") {
      const page = await ctx.db.query("users").order("desc").paginate(options)
      for (const row of page.page) userIds.add(row._id)
      const accounts = await Promise.all(
        page.page.map((user) =>
          ctx.db
            .query("creatorAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .unique()
        )
      )
      creatorAccounts = accounts.filter(
        (row): row is Doc<"creatorAccounts"> => row !== null
      )
      continueCursor = page.isDone ? null : page.continueCursor
    } else if (args.scope === "creator-access") {
      const page = await ctx.db.query("users").order("desc").paginate(options)
      for (const row of page.page) userIds.add(row._id)
      continueCursor = page.isDone ? null : page.continueCursor
    }
    const users: Doc<"users">[] = []
    const customers: Doc<"billingCustomers">[] = []
    const subscriptions: Doc<"billingSubscriptions">[] = []
    const accessGrants: Doc<"billingAccessGrants">[] = []
    for (const userId of userIds) {
      const [user, userCustomers, userSubscriptions, userGrants] =
        await Promise.all([
          ctx.db.get(userId),
          ctx.db
            .query("billingCustomers")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .take(21),
          ctx.db
            .query("billingSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .take(101),
          ctx.db
            .query("billingAccessGrants")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .take(101),
        ])
      if (
        userCustomers.length > 20 ||
        userSubscriptions.length > 100 ||
        userGrants.length > 100
      ) {
        throw new Error(
          "Account history exceeds the safe billing page limit. No partial billing data was returned."
        )
      }
      if (user) users.push(user)
      customers.push(...userCustomers)
      subscriptions.push(...userSubscriptions)
      accessGrants.push(...userGrants)
    }
    return {
      users,
      customers: args.scope === "customers" ? primaryCustomers : customers,
      subscriptions,
      primarySubscriptionIds: primarySubscriptions.map((row) => row._id),
      accessGrants,
      creatorAccounts,
      continueCursor,
    }
  },
})
export const getBillingCreatorReferralCountPage = internalQuery({
  args: {
    creatorAccountId: v.id("creatorAccounts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("creatorAttributions")
      .withIndex("by_creatorAccountId", (q) =>
        q.eq("creatorAccountId", args.creatorAccountId)
      )
      .paginate({
        ...args.paginationOpts,
        numItems: 50,
        maximumRowsRead: 50,
        maximumBytesRead: 128_000,
      })
    let signupCount = 0
    let paidConversionCount = 0
    for (const attribution of page.page) {
      // Count the first attribution per creator/user, including inactive history.
      const first = await ctx.db
        .query("creatorAttributions")
        .withIndex("by_creatorAccountId_userId", (q) =>
          q
            .eq("creatorAccountId", args.creatorAccountId)
            .eq("userId", attribution.userId)
        )
        .first()
      if (first?._id !== attribution._id) continue
      signupCount += 1
      for (const status of [
        "active",
        "canceled",
        "past_due",
        "paused",
        "trialing",
        "unpaid",
      ] as const) {
        const subscription = await ctx.db
          .query("billingSubscriptions")
          .withIndex("by_userId_status", (q) =>
            q.eq("userId", attribution.userId).eq("status", status)
          )
          .first()
        if (subscription) {
          paidConversionCount += 1
          break
        }
      }
    }
    return {
      signupCount,
      paidConversionCount,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})

export const getBillingCreatorAccountsById = internalQuery({
  args: { ids: v.array(v.id("creatorAccounts")) },
  handler: async (ctx, args) => {
    if (args.ids.length > 200)
      throw new Error("Creator account batches are limited to 200.")
    const rows = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return rows.filter((row): row is Doc<"creatorAccounts"> => row !== null)
  },
})
