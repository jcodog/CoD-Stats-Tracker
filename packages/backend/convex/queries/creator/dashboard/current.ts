import { query, type QueryCtx } from "../../../_generated/server"
import type { Doc, Id } from "../../../_generated/dataModel"
import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import {
  getCreatorConnectPendingActions,
  getCreatorConnectState,
} from "../../../../src/lib/creator/program"
import { isCreatorEarningEstimateStatus } from "../../../../src/lib/creator/accounting"

const PAID_CONVERSION_STATUSES = new Set<Doc<"billingSubscriptions">["status"]>(
  ["active", "canceled", "past_due", "paused", "trialing", "unpaid"] as const
)

export const getCurrentCreatorDashboard = query({
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

    const creatorAccount = await ctx.db
      .query("creatorAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", user._id))
      .unique()

    if (!creatorAccount) {
      return {
        creatorAccount: null,
      }
    }

    const connectState = getCreatorConnectState(creatorAccount)
    const pendingActions = getCreatorConnectPendingActions(creatorAccount)

    return {
      creatorAccount: {
        code: creatorAccount.code,
        codeActive: creatorAccount.codeActive,
        connectState,
        connectStatusUpdatedAt: creatorAccount.connectStatusUpdatedAt ?? null,
        country: creatorAccount.country,
        detailsSubmitted: creatorAccount.detailsSubmitted ?? null,
        discountPercent: creatorAccount.discountPercent,
        payoutEligible: creatorAccount.payoutEligible,
        payoutPercent: creatorAccount.payoutPercent,
        payoutsEnabled: creatorAccount.payoutsEnabled ?? null,
        pendingActions,
        requirementsCurrentlyDue: creatorAccount.requirementsCurrentlyDue ?? [],
        requirementsDisabledReason:
          creatorAccount.requirementsDisabledReason ?? null,
        requirementsDue: creatorAccount.requirementsDue ?? [],
        requirementsPastDue: creatorAccount.requirementsPastDue ?? [],
        requirementsPendingVerification:
          creatorAccount.requirementsPendingVerification ?? [],
        sharePath: `/?creator=${encodeURIComponent(creatorAccount.code)}`,
        stripeConnectedAccountId:
          creatorAccount.stripeConnectedAccountId ?? null,
      },
    }
  },
})

async function getCurrentCreatorAccount(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Sign in to view creator metrics.")
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique()
  if (!user) throw new Error("Creator account unavailable.")
  const account = await ctx.db
    .query("creatorAccounts")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique()
  if (!account) throw new Error("Creator profile not configured.")
  return account
}

async function hasPaidConversion(
  ctx: QueryCtx,
  creatorAccountId: Id<"creatorAccounts">,
  userId: Id<"users">
) {
  const lock = await ctx.db
    .query("creatorCodeUsageLocks")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  if (lock?.creatorAccountId === creatorAccountId) {
    if (!lock.stripeSubscriptionId) return false
    const subscription = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", lock.stripeSubscriptionId!)
      )
      .unique()
    return (
      subscription?.userId === userId &&
      PAID_CONVERSION_STATUSES.has(subscription.status)
    )
  }
  const matches = await Promise.all(
    Array.from(PAID_CONVERSION_STATUSES, (status) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", status)
        )
        .first()
    )
  )
  return matches.some(Boolean)
}

export const getCreatorMetricsPage = query({
  args: {
    kind: v.union(
      v.literal("attributions"),
      v.literal("locks"),
      v.literal("earnings")
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const account = await getCurrentCreatorAccount(ctx)
    const pagination = {
      ...args.paginationOpts,
      numItems: Math.min(args.paginationOpts.numItems, 50),
      maximumRowsRead: 50,
      maximumBytesRead: 256_000,
    }
    if (args.kind === "earnings") {
      const result = await ctx.db
        .query("creatorEarningLedger")
        .withIndex("by_creatorAccountId", (q) =>
          q.eq("creatorAccountId", account._id)
        )
        .paginate(pagination)
      return {
        ...result,
        page: result.page
          .filter((row) => isCreatorEarningEstimateStatus(row.status))
          .map((row) => ({
            kind: "earning" as const,
            currency: row.currency,
            amount: row.earningAmount,
          })),
      }
    }
    const result =
      args.kind === "attributions"
        ? await ctx.db
            .query("creatorAttributions")
            .withIndex("by_creatorAccountId", (q) =>
              q.eq("creatorAccountId", account._id)
            )
            .paginate(pagination)
        : await ctx.db
            .query("creatorCodeUsageLocks")
            .withIndex("by_creatorAccountId", (q) =>
              q.eq("creatorAccountId", account._id)
            )
            .paginate(pagination)
    const page = await Promise.all(
      result.page.map(async (row) => ({
        kind: "referral" as const,
        key: row.userId,
        paid: await hasPaidConversion(ctx, account._id, row.userId),
      }))
    )
    return { ...result, page }
  },
})
