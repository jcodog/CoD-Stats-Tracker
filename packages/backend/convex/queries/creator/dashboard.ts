import { query } from "../../_generated/server"
import {
  getCreatorConnectPendingActions,
  getCreatorConnectState,
} from "../../lib/creatorProgram"

const PAID_CONVERSION_STATUSES = new Set([
  "active",
  "canceled",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
])

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
        paidConversionCount: 0,
        signupCount: 0,
      }
    }

    const attributions = await ctx.db
      .query("creatorAttributions")
      .withIndex("by_creatorAccountId", (query) =>
        query.eq("creatorAccountId", creatorAccount._id)
      )
      .collect()

    const attributedUserIds = [
      ...new Set(attributions.map((item) => item.userId)),
    ]
    const subscriptionBuckets = await Promise.all(
      attributedUserIds.map((userId) =>
        ctx.db
          .query("billingSubscriptions")
          .withIndex("by_userId", (query) => query.eq("userId", userId))
          .collect()
      )
    )

    const paidConversionCount = subscriptionBuckets.reduce(
      (count, subscriptions) => {
        return (
          count +
          (subscriptions.some((subscription) =>
            PAID_CONVERSION_STATUSES.has(subscription.status)
          )
            ? 1
            : 0)
        )
      },
      0
    )

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
        sharePath: `/pricing?creator=${encodeURIComponent(creatorAccount.code)}`,
        stripeConnectedAccountId:
          creatorAccount.stripeConnectedAccountId ?? null,
      },
      paidConversionCount,
      signupCount: attributedUserIds.length,
    }
  },
})

export const getCurrentCreatorWorkspaceState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return {
        hasCreatorAccount: false,
      }
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!user) {
      return {
        hasCreatorAccount: false,
      }
    }

    const creatorAccount = await ctx.db
      .query("creatorAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", user._id))
      .unique()

    return {
      hasCreatorAccount: Boolean(creatorAccount),
    }
  },
})
