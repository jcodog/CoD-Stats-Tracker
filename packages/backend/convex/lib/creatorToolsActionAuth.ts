"use node"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import type { ActionCtx } from "../_generated/server"
import { getClerkBackendClient } from "./clerk"

function hasLinkedTwitchAccount(
  externalAccounts: Array<{ provider?: string | null }> | null | undefined
) {
  return (
    externalAccounts?.some((account) => {
      const provider = account.provider?.toLowerCase()
      return provider === "oauth_twitch" || provider === "twitch"
    }) ?? false
  )
}

async function getCreatorActionActor(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("You must be signed in to manage Play With Viewers.")
  }

  const user = await ctx.runQuery(internal.queries.staff.internal.getUserByClerkUserId, {
    clerkUserId: identity.subject,
  })

  if (!user) {
    throw new Error("Unable to resolve your creator account.")
  }

  const billingState = await ctx.runQuery(
    internal.queries.billing.resolution.resolveUserPlanState,
    {
      userId: user._id,
    }
  )

  if (billingState?.effectivePlanKey !== "creator" && user.plan !== "creator") {
    throw new Error("Creator plan access is required for Play With Viewers.")
  }

  return {
    billingState,
    clerkUserId: identity.subject,
    user,
  }
}

export async function requireCreatorToolsActionAccess(
  ctx: ActionCtx,
  options?: {
    requireTwitchLinked?: boolean
  }
) {
  const actor = await getCreatorActionActor(ctx)
  const requireTwitchLinked = options?.requireTwitchLinked ?? true

  if (!requireTwitchLinked) {
    return {
      ...actor,
      hasTwitchLinked: true,
    }
  }

  const clerkUser = await getClerkBackendClient().users.getUser(actor.clerkUserId)
  const rawExternalAccounts =
    (clerkUser as { externalAccounts?: Array<{ provider?: string | null }> | null })
      .externalAccounts ??
    (
      clerkUser as {
        external_accounts?: Array<{ provider?: string | null }> | null
      }
    ).external_accounts ??
    null
  const linked = hasLinkedTwitchAccount(rawExternalAccounts)

  if (!linked) {
    throw new Error("Link Twitch to use Play With Viewers creator tools.")
  }

  return {
    ...actor,
    hasTwitchLinked: linked,
  }
}

export async function requireOwnedQueueActionAccess(
  ctx: ActionCtx,
  queueId: Id<"viewerQueues">
) {
  const actor = await requireCreatorToolsActionAccess(ctx)
  const queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId,
    }
  )

  if (queue.creatorUserId !== actor.user._id) {
    throw new Error("You do not have access to this queue.")
  }

  return {
    ...actor,
    queue,
  }
}

export async function requireOwnedQueueEntryActionAccess(
  ctx: ActionCtx,
  entryId: Id<"viewerQueueEntries">
) {
  const actor = await requireCreatorToolsActionAccess(ctx)
  const entry = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueEntryById,
    {
      entryId,
    }
  )

  if (!entry) {
    throw new Error("Queue entry not found")
  }

  const queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId: entry.queueId,
    }
  )

  if (queue.creatorUserId !== actor.user._id) {
    throw new Error("You do not have access to this queue entry.")
  }

  return {
    ...actor,
    entry,
    queue,
  }
}
