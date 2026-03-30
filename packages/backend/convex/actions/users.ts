"use node"

import type { UserJSON } from "@clerk/nextjs/server"
import { v, type Validator } from "convex/values"

import { internalAction } from "../_generated/server"
import { syncClerkPublicMetadataRole } from "../lib/clerk"
import { resolveProvisionedUserRoleFromClerk } from "../lib/clerkUsers"

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
