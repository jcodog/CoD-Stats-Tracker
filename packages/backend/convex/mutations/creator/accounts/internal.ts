import { v } from "convex/values"

import { internalMutation } from "../../../_generated/server"

export const upsertCreatorAccount = internalMutation({
  args: {
    clerkUserId: v.string(),
    code: v.string(),
    codeActive: v.boolean(),
    country: v.string(),
    discountPercent: v.number(),
    payoutEligible: v.boolean(),
    payoutPercent: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingByUserId = await ctx.db
      .query("creatorAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", args.userId))
      .unique()
    const conflictingAccount = await ctx.db
      .query("creatorAccounts")
      .withIndex("by_normalizedCode", (query) =>
        query.eq("normalizedCode", args.code)
      )
      .unique()
    const now = Date.now()

    if (
      conflictingAccount &&
      conflictingAccount._id !== existingByUserId?._id
    ) {
      throw new Error(
        "That creator code is already assigned to another account."
      )
    }

    if (!existingByUserId) {
      const creatorAccountId = await ctx.db.insert("creatorAccounts", {
        clerkUserId: args.clerkUserId,
        code: args.code,
        codeActive: args.codeActive,
        country: args.country,
        createdAt: now,
        discountPercent: args.discountPercent,
        normalizedCode: args.code,
        payoutEligible: args.payoutEligible,
        payoutPercent: args.payoutPercent,
        updatedAt: now,
        userId: args.userId,
      })

      return await ctx.db.get(creatorAccountId)
    }

    await ctx.db.patch(existingByUserId._id, {
      clerkUserId: args.clerkUserId,
      code: args.code,
      codeActive: args.codeActive,
      country: args.country,
      discountPercent: args.discountPercent,
      normalizedCode: args.code,
      payoutEligible: args.payoutEligible,
      payoutPercent: args.payoutPercent,
      updatedAt: now,
    })

    return await ctx.db.get(existingByUserId._id)
  },
})

export const applyStripeConnectedAccountSnapshot = internalMutation({
  args: {
    chargesEnabled: v.boolean(),
    connectStatusUpdatedAt: v.number(),
    creatorAccountId: v.optional(v.id("creatorAccounts")),
    detailsSubmitted: v.boolean(),
    payoutsEnabled: v.boolean(),
    requirementsCurrentlyDue: v.array(v.string()),
    requirementsDisabledReason: v.optional(v.string()),
    requirementsDue: v.array(v.string()),
    requirementsPastDue: v.array(v.string()),
    requirementsPendingVerification: v.array(v.string()),
    stripeConnectedAccountId: v.string(),
    stripeConnectedAccountVersion: v.optional(
      v.union(v.literal("v1"), v.literal("v2"))
    ),
  },
  handler: async (ctx, args) => {
    const creatorAccount = args.creatorAccountId
      ? await ctx.db.get(args.creatorAccountId)
      : await ctx.db
          .query("creatorAccounts")
          .withIndex("by_stripeConnectedAccountId", (query) =>
            query.eq("stripeConnectedAccountId", args.stripeConnectedAccountId)
          )
          .unique()

    if (!creatorAccount) {
      throw new Error("Creator account not found for Stripe connected account.")
    }

    await ctx.db.patch(creatorAccount._id, {
      chargesEnabled: args.chargesEnabled,
      connectStatusUpdatedAt: args.connectStatusUpdatedAt,
      detailsSubmitted: args.detailsSubmitted,
      payoutsEnabled: args.payoutsEnabled,
      requirementsCurrentlyDue: args.requirementsCurrentlyDue,
      requirementsDisabledReason: args.requirementsDisabledReason,
      requirementsDue: args.requirementsDue,
      requirementsPastDue: args.requirementsPastDue,
      requirementsPendingVerification: args.requirementsPendingVerification,
      stripeConnectedAccountId: args.stripeConnectedAccountId,
      stripeConnectedAccountVersion:
        args.stripeConnectedAccountVersion ??
        creatorAccount.stripeConnectedAccountVersion,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(creatorAccount._id)
  },
})

export const confirmCreatorConnectCountry = internalMutation({
  args: {
    country: v.string(),
    creatorAccountId: v.id("creatorAccounts"),
  },
  handler: async (ctx, args) => {
    const creatorAccount = await ctx.db.get(args.creatorAccountId)

    if (!creatorAccount) {
      throw new Error("Creator account not found.")
    }

    if (creatorAccount.stripeConnectedAccountId) {
      throw new Error("Creator country cannot change after Stripe setup starts.")
    }

    await ctx.db.patch(creatorAccount._id, {
      country: args.country,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(creatorAccount._id)
  },
})

export const resetRejectedLegacyStripeAssociation = internalMutation({
  args: {
    creatorAccountId: v.id("creatorAccounts"),
  },
  handler: async (ctx, args) => {
    const creatorAccount = await ctx.db.get(args.creatorAccountId)

    if (!creatorAccount) {
      throw new Error("Creator account not found.")
    }

    if (
      creatorAccount.stripeConnectedAccountVersion !== "v1" ||
      !creatorAccount.stripeConnectedAccountId ||
      !creatorAccount.requirementsDisabledReason
        ?.toLowerCase()
        .startsWith("rejected")
    ) {
      throw new Error(
        "Only a terminally rejected legacy Stripe association can be reset."
      )
    }

    const [ledgerRows, payoutTransfers] = await Promise.all([
      ctx.db
        .query("creatorEarningLedger")
        .withIndex("by_creatorAccountId", (query) =>
          query.eq("creatorAccountId", creatorAccount._id)
        )
        .collect(),
      ctx.db
        .query("creatorPayoutTransfers")
        .withIndex("by_creatorAccountId", (query) =>
          query.eq("creatorAccountId", creatorAccount._id)
        )
        .collect(),
    ])
    const hasCompletedTransfer =
      payoutTransfers.some(
        (transfer) =>
          transfer.status === "transferred" ||
          Boolean(transfer.stripeTransferId) ||
          Boolean(transfer.transferredAt)
      ) ||
      ledgerRows.some(
        (row) =>
          row.status === "transferred" ||
          Boolean(row.stripeTransferId) ||
          Boolean(row.transferredAt)
      )
    const hasActiveReservation =
      payoutTransfers.some((transfer) => transfer.status !== "cancelled") ||
      ledgerRows.some(
        (row) => row.status === "reserved" || Boolean(row.payoutRunId)
      )

    if (hasCompletedTransfer) {
      throw new Error(
        "This association cannot be reset because creator transfers have completed."
      )
    }

    if (hasActiveReservation) {
      throw new Error(
        "This association cannot be reset while a payout reservation or run exists."
      )
    }

    const previousStripeConnectedAccountId =
      creatorAccount.stripeConnectedAccountId

    await ctx.db.patch(creatorAccount._id, {
      chargesEnabled: undefined,
      connectStatusUpdatedAt: undefined,
      detailsSubmitted: undefined,
      payoutsEnabled: undefined,
      requirementsCurrentlyDue: undefined,
      requirementsDisabledReason: undefined,
      requirementsDue: undefined,
      requirementsPastDue: undefined,
      requirementsPendingVerification: undefined,
      stripeConnectedAccountId: undefined,
      stripeConnectedAccountVersion: undefined,
      updatedAt: Date.now(),
    })

    return {
      creatorAccount: await ctx.db.get(creatorAccount._id),
      previousStripeConnectedAccountId,
    }
  },
})
