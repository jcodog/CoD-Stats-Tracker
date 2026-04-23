"use node"

import type { UserJSON } from "@clerk/nextjs/server"
import { v, type Validator } from "convex/values"

import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { syncClerkPublicMetadataRole } from "../lib/clerk"
import {
  getConnectedAccountsFromClerkUser,
  resolveProvisionedUserRoleFromClerk,
} from "../lib/clerkUsers"
import { getClerkBackendClient } from "../lib/clerk"

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
  },
  handler: async (ctx, args) => {
    const users = await ctx.runQuery(internal.queries.staff.internal.listUsers, {})
    const targetUsers =
      typeof args.limit === "number" ? users.slice(0, args.limit) : users
    const clerk = getClerkBackendClient()
    let syncedCount = 0

    for (const user of targetUsers) {
      if (!user.clerkUserId) {
        continue
      }

      const clerkUser = await clerk.users.getUser(user.clerkUserId)
      await ctx.runMutation(internal.mutations.users.syncConnectedAccountsForUser, {
        accounts: getConnectedAccountsFromClerkUser(clerkUser),
        userId: user._id,
      })
      syncedCount += 1
    }

    return {
      syncedCount,
      totalUsers: targetUsers.length,
    }
  },
})
