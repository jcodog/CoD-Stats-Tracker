import { query } from "../../_generated/server"

const PAID_CONVERSION_STATUSES = new Set([
  "active",
  "canceled",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
])

function getConnectState(args: {
  detailsSubmitted?: boolean
  payoutsEnabled?: boolean
  requirementsDue?: string[]
  stripeConnectedAccountId?: string
}) {
  if (!args.stripeConnectedAccountId) {
    return "not_started" as const
  }

  if ((args.requirementsDue?.length ?? 0) > 0 || args.detailsSubmitted === false) {
    return "action_required" as const
  }

  if (args.payoutsEnabled === true) {
    return "ready" as const
  }

  return "review" as const
}

function getPendingActions(args: {
  codeActive?: boolean
  detailsSubmitted?: boolean
  payoutEligible?: boolean
  payoutsEnabled?: boolean
  requirementsDue?: string[]
  stripeConnectedAccountId?: string
}) {
  const actions: string[] = []

  if (args.codeActive === false) {
    actions.push("Your creator code is currently disabled.")
  }

  if (args.payoutEligible === false) {
    actions.push("Payout eligibility is currently paused for this account.")
  }

  if (!args.stripeConnectedAccountId) {
    actions.push("Connect Stripe to start payout setup.")
    return actions
  }

  if (args.detailsSubmitted === false) {
    actions.push("Finish Stripe onboarding to submit your payout details.")
  }

  if ((args.requirementsDue?.length ?? 0) > 0) {
    actions.push(
      `Stripe still needs ${args.requirementsDue?.length ?? 0} additional detail${(args.requirementsDue?.length ?? 0) === 1 ? "" : "s"}.`
    )
  }

  if (args.payoutsEnabled === false && (args.requirementsDue?.length ?? 0) === 0) {
    actions.push("Stripe is still reviewing your payout setup before payouts can go live.")
  }

  return actions
}

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

    const attributedUserIds = [...new Set(attributions.map((item) => item.userId))]
    const subscriptionBuckets = await Promise.all(
      attributedUserIds.map((userId) =>
        ctx.db
          .query("billingSubscriptions")
          .withIndex("by_userId", (query) => query.eq("userId", userId))
          .collect()
      )
    )

    const paidConversionCount = subscriptionBuckets.reduce((count, subscriptions) => {
      return count +
        (subscriptions.some((subscription) =>
          PAID_CONVERSION_STATUSES.has(subscription.status)
        )
          ? 1
          : 0)
    }, 0)

    const connectState = getConnectState(creatorAccount)
    const pendingActions = getPendingActions(creatorAccount)

    return {
      creatorAccount: {
        code: creatorAccount.code,
        codeActive: creatorAccount.codeActive,
        connectState,
        detailsSubmitted: creatorAccount.detailsSubmitted ?? null,
        discountPercent: creatorAccount.discountPercent,
        payoutEligible: creatorAccount.payoutEligible,
        payoutPercent: creatorAccount.payoutPercent,
        payoutsEnabled: creatorAccount.payoutsEnabled ?? null,
        pendingActions,
        requirementsDue: creatorAccount.requirementsDue ?? [],
        sharePath: `/pricing?creator=${encodeURIComponent(creatorAccount.code)}`,
        stripeConnectedAccountId: creatorAccount.stripeConnectedAccountId ?? null,
      },
      paidConversionCount,
      signupCount: attributedUserIds.length,
    }
  },
})
