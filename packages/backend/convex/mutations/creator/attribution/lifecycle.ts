import { v } from "convex/values"

import type { Doc } from "../../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../../_generated/server"
import { calculateCreatorPayoutEligibilityEndsAt } from "../../../../src/lib/creator/accounting"

export type EnsureCanonicalAttributionResult =
  | {
      status: "applied"
    }
  | {
      status: "confirmed_existing"
    }
  | {
      existingCode: string
      status: "conflict_locked"
    }

export type EnsureCreatorCodeUsageLockResult =
  | {
      status: "locked"
      usageLockId: Doc<"creatorCodeUsageLocks">["_id"]
    }
  | {
      status: "confirmed_existing"
      usageLockId: Doc<"creatorCodeUsageLocks">["_id"]
    }
  | {
      existingCode: string
      status: "already_used"
      stripeSubscriptionId: string
      usageLockId: Doc<"creatorCodeUsageLocks">["_id"]
    }
  | {
      existingCode: string
      status: "conflict_locked"
      usageLockId: Doc<"creatorCodeUsageLocks">["_id"]
    }

async function getCreatorUsageLockByUserId(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"]
) {
  const locks = await ctx.db
    .query("creatorCodeUsageLocks")
    .withIndex("by_userId", (query) => query.eq("userId", userId))
    .collect()

  return (
    locks.sort((left, right) => left.createdAt - right.createdAt)[0] ?? null
  )
}

async function insertCanonicalAttribution(args: {
  clerkUserId: string
  ctx: MutationCtx
  creatorAccountId: Doc<"creatorAccounts">["_id"]
  creatorCode: string
  normalizedCode: string
  source: "cookie" | "manual" | "staff"
  userId: Doc<"users">["_id"]
}) {
  const now = Date.now()

  await args.ctx.db.insert("creatorAttributions", {
    active: true,
    clerkUserId: args.clerkUserId,
    createdAt: now,
    creatorAccountId: args.creatorAccountId,
    creatorCode: args.creatorCode,
    normalizedCode: args.normalizedCode,
    source: args.source,
    updatedAt: now,
    userId: args.userId,
  })
}

export const ensureCanonicalAttribution = internalMutation({
  args: {
    clerkUserId: v.string(),
    creatorAccountId: v.id("creatorAccounts"),
    creatorCode: v.string(),
    normalizedCode: v.string(),
    source: v.union(
      v.literal("cookie"),
      v.literal("manual"),
      v.literal("staff")
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<EnsureCanonicalAttributionResult> => {
    const existingUsageLock = await getCreatorUsageLockByUserId(
      ctx,
      args.userId
    )
    const existingAttribution = await ctx.db
      .query("creatorAttributions")
      .withIndex("by_userId_active", (query) =>
        query.eq("userId", args.userId).eq("active", true)
      )
      .unique()

    if (existingUsageLock) {
      if (existingUsageLock.normalizedCode !== args.normalizedCode) {
        return {
          existingCode: existingUsageLock.creatorCode,
          status: "conflict_locked",
        }
      }

      if (!existingAttribution) {
        await insertCanonicalAttribution({
          ...args,
          ctx,
        })
      }

      return {
        status: "confirmed_existing",
      }
    }

    if (!existingAttribution) {
      await insertCanonicalAttribution({
        ...args,
        ctx,
      })

      return {
        status: "applied",
      }
    }

    if (existingAttribution.normalizedCode === args.normalizedCode) {
      return {
        status: "confirmed_existing",
      }
    }

    return {
      existingCode: existingAttribution.creatorCode,
      status: "conflict_locked",
    }
  },
})

export const ensureCreatorCodeUsageLock = internalMutation({
  args: {
    clerkUserId: v.string(),
    creatorAccountId: v.id("creatorAccounts"),
    creatorCode: v.string(),
    discountAppliedAt: v.optional(v.number()),
    discountPercent: v.number(),
    normalizedCode: v.string(),
    payoutPercent: v.number(),
    source: v.union(
      v.literal("cookie"),
      v.literal("manual"),
      v.literal("staff")
    ),
    stripeCustomerId: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<EnsureCreatorCodeUsageLockResult> => {
    const existingUsageLock = await getCreatorUsageLockByUserId(
      ctx,
      args.userId
    )

    if (existingUsageLock) {
      if (existingUsageLock.normalizedCode !== args.normalizedCode) {
        return {
          existingCode: existingUsageLock.creatorCode,
          status: "conflict_locked",
          usageLockId: existingUsageLock._id,
        }
      }

      if (existingUsageLock.stripeSubscriptionId) {
        return {
          existingCode: existingUsageLock.creatorCode,
          status: "already_used",
          stripeSubscriptionId: existingUsageLock.stripeSubscriptionId,
          usageLockId: existingUsageLock._id,
        }
      }

      const patch: Partial<Doc<"creatorCodeUsageLocks">> = {}

      if (
        args.stripeCustomerId &&
        existingUsageLock.stripeCustomerId !== args.stripeCustomerId
      ) {
        patch.stripeCustomerId = args.stripeCustomerId
      }

      if (
        args.discountAppliedAt &&
        existingUsageLock.discountAppliedAt === undefined
      ) {
        patch.discountAppliedAt = args.discountAppliedAt
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = Date.now()
        await ctx.db.patch(existingUsageLock._id, patch)
      }

      return {
        status: "confirmed_existing",
        usageLockId: existingUsageLock._id,
      }
    }

    const now = Date.now()
    const usageLockId = await ctx.db.insert("creatorCodeUsageLocks", {
      clerkUserId: args.clerkUserId,
      createdAt: now,
      creatorAccountId: args.creatorAccountId,
      creatorCode: args.creatorCode,
      discountAppliedAt: args.discountAppliedAt,
      discountPercent: args.discountPercent,
      normalizedCode: args.normalizedCode,
      payoutPercent: args.payoutPercent,
      source: args.source,
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: now,
      userId: args.userId,
    })

    return {
      status: "locked",
      usageLockId,
    }
  },
})

export const attachCheckoutSessionToUsageLock = internalMutation({
  args: {
    checkoutSessionCreatedAt: v.number(),
    stripeCheckoutSessionId: v.string(),
    usageLockId: v.id("creatorCodeUsageLocks"),
  },
  handler: async (ctx, args) => {
    const usageLock = await ctx.db.get(args.usageLockId)

    if (!usageLock) {
      return null
    }

    await ctx.db.patch(usageLock._id, {
      checkoutSessionCreatedAt: args.checkoutSessionCreatedAt,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: Date.now(),
    })

    return usageLock._id
  },
})

export const bindUsageLockToSubscription = internalMutation({
  args: {
    clerkUserId: v.string(),
    creatorCode: v.optional(v.string()),
    creatorDiscountPercent: v.optional(v.number()),
    creatorPayoutPercent: v.optional(v.number()),
    creatorUsageLockId: v.optional(v.id("creatorCodeUsageLocks")),
    normalizedCode: v.optional(v.string()),
    source: v.optional(
      v.union(v.literal("cookie"), v.literal("manual"), v.literal("staff"))
    ),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    subscriptionStartedAt: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingById = args.creatorUsageLockId
      ? await ctx.db.get(args.creatorUsageLockId)
      : null
    const existingByUserId = await getCreatorUsageLockByUserId(ctx, args.userId)
    let usageLock = existingById ?? existingByUserId

    const normalizedCode = args.normalizedCode
    const creatorCode = args.creatorCode

    if (!usageLock && normalizedCode && creatorCode) {
      const creatorAccount = await ctx.db
        .query("creatorAccounts")
        .withIndex("by_normalizedCode", (query) =>
          query.eq("normalizedCode", normalizedCode)
        )
        .unique()

      if (!creatorAccount || creatorAccount.userId === args.userId) {
        return {
          status: "missing_lock" as const,
        }
      }

      const now = Date.now()
      const usageLockId = await ctx.db.insert("creatorCodeUsageLocks", {
        attributionStartedAt: args.subscriptionStartedAt,
        clerkUserId: args.clerkUserId,
        createdAt: now,
        creatorAccountId: creatorAccount._id,
        creatorCode: creatorAccount.code,
        discountAppliedAt: args.subscriptionStartedAt,
        discountPercent:
          args.creatorDiscountPercent ?? creatorAccount.discountPercent,
        normalizedCode,
        payoutEligibilityEndsAt: calculateCreatorPayoutEligibilityEndsAt(
          args.subscriptionStartedAt
        ),
        payoutPercent:
          args.creatorPayoutPercent ?? creatorAccount.payoutPercent,
        source: args.source ?? "manual",
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        subscriptionBoundAt: now,
        updatedAt: now,
        userId: args.userId,
      })

      return {
        status: "created_and_bound" as const,
        usageLockId,
      }
    }

    if (!usageLock) {
      return {
        status: "missing_lock" as const,
      }
    }

    if (usageLock.userId !== args.userId) {
      return {
        status: "lock_user_mismatch" as const,
        usageLockId: usageLock._id,
      }
    }

    if (
      usageLock.stripeSubscriptionId &&
      usageLock.stripeSubscriptionId !== args.stripeSubscriptionId
    ) {
      return {
        status: "subscription_conflict" as const,
        stripeSubscriptionId: usageLock.stripeSubscriptionId,
        usageLockId: usageLock._id,
      }
    }

    const attributionStartedAt =
      usageLock.attributionStartedAt ?? args.subscriptionStartedAt
    const payoutEligibilityEndsAt =
      usageLock.payoutEligibilityEndsAt ??
      calculateCreatorPayoutEligibilityEndsAt(attributionStartedAt)
    const wasBoundBefore = Boolean(usageLock.stripeSubscriptionId)

    await ctx.db.patch(usageLock._id, {
      attributionStartedAt,
      payoutEligibilityEndsAt,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionBoundAt: usageLock.subscriptionBoundAt ?? Date.now(),
      updatedAt: Date.now(),
    })

    return {
      status: wasBoundBefore
        ? ("confirmed_existing" as const)
        : ("bound" as const),
      usageLockId: usageLock._id,
    }
  },
})
