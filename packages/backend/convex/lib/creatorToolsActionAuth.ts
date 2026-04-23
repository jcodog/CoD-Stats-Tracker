"use node"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import type { ActionCtx } from "../_generated/server"
import { hasCreatorAccessFromState } from "./billingAccess"
import { getClerkBackendClient } from "./clerk"
import { getTwitchAccountFromClerkUser } from "./clerkUsers"
import { isPlayWithViewersTwitchEnabled } from "./creatorToolsConfig"

type CreatorActionActor = Awaited<ReturnType<typeof getCreatorActionActor>>
type TwitchAccount = NonNullable<ReturnType<typeof getTwitchAccountFromClerkUser>>

type CreatorToolsActionAccess =
  | (CreatorActionActor & {
      hasTwitchLinked: true
      twitchAccount: TwitchAccount
    })
  | (CreatorActionActor & {
      hasTwitchLinked: false
      twitchAccount?: never
    })

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

  if (
    !hasCreatorAccessFromState({
      fallbackPlanKey: user.plan,
      state: billingState,
    })
  ) {
    throw new Error("Creator plan access is required for Play With Viewers.")
  }

  return {
    billingState,
    clerkUserId: identity.subject,
    user,
  }
}

export async function requireCreatorToolsActionAccess(
  ctx: ActionCtx
): Promise<CreatorToolsActionAccess>
export async function requireCreatorToolsActionAccess(
  ctx: ActionCtx,
  options: {
    requireTwitchLinked: false
  }
): Promise<CreatorToolsActionAccess>
export async function requireCreatorToolsActionAccess(
  ctx: ActionCtx,
  options?: {
    requireTwitchLinked?: boolean
  }
): Promise<CreatorToolsActionAccess> {
  const actor = await getCreatorActionActor(ctx)
  const requireTwitchLinked = options?.requireTwitchLinked ?? true

  if (!requireTwitchLinked || !isPlayWithViewersTwitchEnabled()) {
    return {
      ...actor,
      hasTwitchLinked: false,
    }
  }

  const clerkUser = await getClerkBackendClient().users.getUser(actor.clerkUserId)
  const twitchAccount = getTwitchAccountFromClerkUser(clerkUser)

  if (!twitchAccount) {
    throw new Error("Link Twitch to use Play With Viewers creator tools.")
  }

  return {
    ...actor,
    hasTwitchLinked: true,
    twitchAccount,
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
