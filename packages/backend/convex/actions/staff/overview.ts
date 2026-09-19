"use node"

import { action, type ActionCtx } from "../../_generated/server"
import { internal } from "../../_generated/api"
import {
  emptyStaffMetrics,
  STAFF_METRIC_KEYS,
  type StaffMetrics,
} from "../../../src/lib/staffMetrics"
import { getClerkBackendClient } from "../../../src/lib/clerk"
import {
  StaffAuthorizationError,
  resolveAuthorizedStaffAction,
  type AuthorizedStaffActionContext,
  type RequiredStaffRole,
} from "../../../src/lib/staffActionAuth"
import {
  roleMeetsRequirement,
  type UserRole,
} from "../../../src/lib/staffRoles"
import type {
  StaffAuditLogEntry,
  StaffBillingSyncSummary,
  StaffOverviewDashboard,
  StaffOverviewTimelinePoint,
} from "../../../src/lib/staffTypes"

type OverviewSubscriptionStatus = "active" | "past_due" | "paused" | "trialing"
type OverviewAuditLogRecord = {
  _id: string
  action: string
  actorClerkUserId: string
  actorName: string
  actorRole: UserRole
  createdAt: number
  details?: string
  entityId: string
  entityLabel?: string
  entityType: string
  result: "error" | "success" | "warning"
  summary: string
}
type OverviewPlanRecord = {
  active: boolean
  archivedAt?: number
  monthlyPriceId?: string
  planType: "free" | "paid"
  stripeProductId?: string
  yearlyPriceId?: string
}
type OverviewRecords = {
  auditLogs: OverviewAuditLogRecord[]
  features: unknown[]
  plans: OverviewPlanRecord[]
}

const OVERVIEW_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "paused",
] as const satisfies readonly OverviewSubscriptionStatus[]

function mapAuditLogEntry(log: OverviewAuditLogRecord): StaffAuditLogEntry {
  return {
    action: log.action,
    actorClerkUserId: log.actorClerkUserId,
    actorName: log.actorName,
    actorRole: log.actorRole,
    createdAt: log.createdAt,
    details: log.details,
    entityId: log.entityId,
    entityLabel: log.entityLabel,
    entityType: log.entityType,
    id: log._id,
    result: log.result,
    summary: log.summary,
  }
}

function getPlanNeedsAttention(plan: {
  active: boolean
  archivedAt?: number
  monthlyPriceId?: string
  planType: "free" | "paid"
  stripeProductId?: string
  yearlyPriceId?: string
}) {
  if (plan.planType === "free") {
    return false
  }

  if (!plan.active || plan.archivedAt !== undefined) {
    return false
  }

  return !plan.stripeProductId || !plan.monthlyPriceId || !plan.yearlyPriceId
}

function parseSyncSummary(details?: string): StaffBillingSyncSummary | null {
  if (!details) {
    return null
  }

  try {
    const parsed = JSON.parse(details) as {
      result?: "error" | "success" | "warning"
      summary?: string
      syncedAt?: number
      warningCount?: number
    }

    if (
      typeof parsed.summary === "string" &&
      typeof parsed.syncedAt === "number" &&
      typeof parsed.warningCount === "number" &&
      (parsed.result === "error" ||
        parsed.result === "success" ||
        parsed.result === "warning")
    ) {
      return {
        result: parsed.result,
        summary: parsed.summary,
        syncedAt: parsed.syncedAt,
        warningCount: parsed.warningCount,
      }
    }
  } catch {
    return null
  }

  return null
}

function getDayStart(timestamp: number) {
  const value = new Date(timestamp)
  value.setHours(0, 0, 0, 0)
  return value.getTime()
}

function buildActivityTimeline(logs: Array<{ createdAt: number }>) {
  const dayStart = getDayStart(Date.now())
  const days = 7
  const countsByDay = new Map<number, number>()

  for (let offset = 0; offset < days; offset += 1) {
    countsByDay.set(dayStart - offset * 86_400_000, 0)
  }

  for (const log of logs) {
    const key = getDayStart(log.createdAt)

    if (countsByDay.has(key)) {
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1)
    }
  }

  return Array.from(countsByDay.entries())
    .map<StaffOverviewTimelinePoint>(([dayStart, count]) => ({
      count,
      dayStart,
    }))
    .sort((left, right) => left.dayStart - right.dayStart)
}

async function readOverviewMetrics(
  ctx: ActionCtx,
  kind: "users" | "subscriptions"
) {
  const totals = emptyStaffMetrics()
  let cursor: string | null = null
  for (;;) {
    const page: {
      totals: StaffMetrics
      isDone: boolean
      continueCursor: string
    } = await ctx.runQuery(
      internal.queries.staff.internal.getOverviewMetricsPage,
      { kind, paginationOpts: { cursor, numItems: 200 } }
    )
    for (const key of STAFF_METRIC_KEYS) totals[key] += page.totals[key]
    if (page.isDone) return totals
    if (page.continueCursor === cursor)
      throw new Error("Overview pagination did not advance.")
    cursor = page.continueCursor
  }
}
export const getDashboard = action({
  args: {},
  handler: async (ctx): Promise<StaffOverviewDashboard> => {
    const operator = await requireAuthorizedStaffAction(ctx, "staff")
    const records = (await ctx.runQuery(
      internal.queries.staff.internal.getOverviewRecords,
      {}
    )) as OverviewRecords
    const canReviewManagement = roleMeetsRequirement(
      operator.actorRole,
      "admin"
    )
    const accessibleAuditLogs = records.auditLogs.filter(
      (log: OverviewAuditLogRecord) =>
        log.entityType.startsWith("billing")
          ? true
          : canReviewManagement && log.entityType === "user"
    )
    const [userMetrics, subscriptionMetrics] = await Promise.all([
      readOverviewMetrics(ctx, "users"),
      readOverviewMetrics(ctx, "subscriptions"),
    ])
    const subscriptionStatusCounts = OVERVIEW_SUBSCRIPTION_STATUSES.map(
      (status) => ({ status, count: subscriptionMetrics[status] })
    )
    const lastSync = parseSyncSummary(
      accessibleAuditLogs.find(
        (log: OverviewAuditLogRecord) => log.action === "billing.catalog.sync"
      )?.details
    )

    return {
      actorRole: operator.actorRole,
      activityTimeline: buildActivityTimeline(accessibleAuditLogs),
      cancelAtPeriodEndCount: subscriptionMetrics.cancelAtPeriodEndCount,
      counts: {
        activeSubscriptions: subscriptionMetrics.activeSubscriptions,
        adminUsers: userMetrics.adminUsers,
        attentionSubscriptions: subscriptionMetrics.attentionSubscriptions,
        billingFeatures: records.features.length,
        billingPlans: records.plans.length,
        staffUsers: userMetrics.staffUsers,
        superAdminUsers: userMetrics.superAdminUsers,
        syncAttentionPlans: records.plans.filter(getPlanNeedsAttention).length,
        trackedUsers: userMetrics.trackedUsers,
      },
      generatedAt: Date.now(),
      lastSync,
      recentActivity: accessibleAuditLogs.slice(0, 8).map(mapAuditLogEntry),
      subscriptionStatusCounts,
    }
  },
})

async function requireAuthorizedStaffAction(
  ctx: ActionCtx,
  requiredRole: RequiredStaffRole
): Promise<AuthorizedStaffActionContext> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new StaffAuthorizationError(
      "unauthenticated",
      "A signed-in session is required to access this staff action.",
      401
    )
  }

  const [clerkUser, dbUser] = await Promise.all([
    getClerkBackendClient().users.getUser(identity.subject),
    ctx.runQuery(internal.queries.staff.internal.getUserByClerkUserId, {
      clerkUserId: identity.subject,
    }),
  ])

  return await resolveAuthorizedStaffAction({
    clerkUser,
    clerkUserId: identity.subject,
    dbUser,
    requiredRole,
  })
}
