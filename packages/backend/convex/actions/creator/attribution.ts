"use node"

import { v } from "convex/values"

import { internal } from "../../_generated/api"
import { action } from "../../_generated/server"
import type { EnsureCanonicalAttributionResult } from "../../mutations/creator/attribution"
import {
  getClerkBackendClient,
  syncClerkCreatorAttributionMetadata,
} from "../../../src/lib/clerk"

type ApplyCreatorCodeResult =
  | {
      status: "unauthenticated"
    }
  | {
      status: "invalid_code"
    }
  | {
      status: "missing_user"
    }
  | {
      status: "code_inactive"
    }
  | {
      status: "self_code_not_allowed"
    }
  | ({
      code: string
      discountPercent: number
    } & EnsureCanonicalAttributionResult)

function normalizeCreatorCode(value: string) {
  const normalizedCode = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

  if (!/^[A-Z0-9]{3,24}$/.test(normalizedCode)) {
    return null
  }

  return normalizedCode
}

export const applyCreatorCode = action({
  args: {
    code: v.string(),
    source: v.union(v.literal("cookie"), v.literal("manual")),
  },
  handler: async (ctx, args): Promise<ApplyCreatorCodeResult> => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return {
        status: "unauthenticated",
      }
    }

    const normalizedCode = normalizeCreatorCode(args.code)

    if (!normalizedCode) {
      return {
        status: "invalid_code",
      }
    }

    const [creatorAccount, user] = await Promise.all([
      ctx.runQuery(
        internal.queries.creator.internal.getCreatorAccountByNormalizedCode,
        {
          normalizedCode,
        }
      ),
      ctx.runQuery(internal.queries.creator.internal.getUserByClerkUserId, {
        clerkUserId: identity.subject,
      }),
    ])

    if (!user) {
      return {
        status: "missing_user",
      }
    }

    if (!creatorAccount || !creatorAccount.codeActive) {
      return {
        status: "code_inactive",
      }
    }

    if (creatorAccount.userId === user._id) {
      return {
        status: "self_code_not_allowed",
      }
    }

    const attributionResult: EnsureCanonicalAttributionResult =
      await ctx.runMutation(
        internal.mutations.creator.attribution.ensureCanonicalAttribution,
        {
          clerkUserId: user.clerkUserId,
          creatorAccountId: creatorAccount._id,
          creatorCode: creatorAccount.code,
          normalizedCode,
          source: args.source,
          userId: user._id,
        }
      )

    if (attributionResult.status === "applied") {
      const clerkUser = await getClerkBackendClient().users.getUser(
        user.clerkUserId
      )

      await syncClerkCreatorAttributionMetadata({
        clerkUserId: user.clerkUserId,
        code: creatorAccount.code,
        currentPublicMetadata: clerkUser.publicMetadata,
        source: args.source,
      })
    }

    return {
      code: creatorAccount.code,
      discountPercent: creatorAccount.discountPercent,
      ...attributionResult,
    }
  },
})
