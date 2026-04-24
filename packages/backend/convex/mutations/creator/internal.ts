import { v } from "convex/values"

import { internalMutation } from "../../_generated/server"
import { CREATOR_PROGRAM_DEFAULTS_KEY } from "../../lib/creatorProgram"

export const upsertCreatorProgramDefaults = internalMutation({
  args: {
    defaultCodeActive: v.boolean(),
    defaultCountry: v.string(),
    defaultDiscountPercent: v.number(),
    defaultPayoutEligible: v.boolean(),
    defaultPayoutPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const existingDefaults = await ctx.db
      .query("creatorProgramDefaults")
      .withIndex("by_key", (query) =>
        query.eq("key", CREATOR_PROGRAM_DEFAULTS_KEY)
      )
      .unique()
    const now = Date.now()

    if (!existingDefaults) {
      const defaultsId = await ctx.db.insert("creatorProgramDefaults", {
        ...args,
        createdAt: now,
        key: CREATOR_PROGRAM_DEFAULTS_KEY,
        updatedAt: now,
      })

      return await ctx.db.get(defaultsId)
    }

    await ctx.db.patch(existingDefaults._id, {
      ...args,
      updatedAt: now,
    })

    return await ctx.db.get(existingDefaults._id)
  },
})

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
