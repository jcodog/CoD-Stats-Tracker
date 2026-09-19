"use node"

import type { UserJSON } from "@clerk/nextjs/server"
import { v, type Validator } from "convex/values"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { internalAction } from "../_generated/server"
import { syncClerkPublicMetadataRole } from "../../src/lib/clerk"
import {
  getConnectedAccountsFromClerkUser,
  resolveProvisionedUserRoleFromClerk,
} from "../../src/lib/clerkUsers"
import { getClerkBackendClient } from "../../src/lib/clerk"

export const syncProvisionedClerkRole = internalAction({
  args: { data: v.any() as Validator<UserJSON> },
  handler: async (_, { data }) => {
    return syncClerkPublicMetadataRole({
      clerkUserId: data.id,
      currentPublicMetadata: data.public_metadata,
      role: resolveProvisionedUserRoleFromClerk(data),
    })
  },
})

export const backfillConnectedAccountsFromClerk = internalAction({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    syncedCount: number
    totalUsers: number
    continueCursor: string | null
  }> => {
    if (
      args.limit !== undefined &&
      (!Number.isSafeInteger(args.limit) || args.limit < 1 || args.limit > 200)
    ) {
      throw new Error("Backfill batches must contain 1 to 200 users.")
    }
    const result = await ctx.runQuery(
      internal.queries.staff.internal.getBillingUsersPage,
      {
        paginationOpts: {
          cursor: args.cursor ?? null,
          numItems: args.limit ?? 100,
        },
      }
    )
    const targetUsers = result.page
    const clerk = getClerkBackendClient()
    let syncedCount = 0

    for (const user of targetUsers) {
      if (!user.clerkUserId) {
        continue
      }

      const clerkUser = await clerk.users.getUser(user.clerkUserId)
      await ctx.runMutation(
        internal.mutations.users.syncConnectedAccountsForUser,
        {
          accounts: getConnectedAccountsFromClerkUser(clerkUser),
          userId: user._id as Id<"users">,
        }
      )
      syncedCount += 1
    }

    return {
      syncedCount,
      totalUsers: targetUsers.length,
      continueCursor: result.isDone ? null : result.continueCursor,
    }
  },
})
