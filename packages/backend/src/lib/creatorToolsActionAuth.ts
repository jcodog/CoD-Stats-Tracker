"use node"

import { internal } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"
import type { ActionCtx } from "../../convex/_generated/server"
import type { BillingStatePlanLike } from "./billingAccess"
import { getClerkBackendClient } from "./clerk"
import { getTwitchAccountFromClerkUser } from "./clerkUsers"
import { hasCreatorWorkspaceAccess } from "./creatorProgram"
import { isPlayWithViewersTwitchEnabled } from "./creatorToolsConfig"

type TwitchAccount = NonNullable<
  ReturnType<typeof getTwitchAccountFromClerkUser>
>

type CreatorActionActor = {
  billingState: BillingStatePlanLike | null
  clerkUserId: string
  user: Doc<"users">
}

type CreatorToolsActionAccess =
  | (CreatorActionActor & {
      hasTwitchLinked: true
      twitchAccount: TwitchAccount
    })
  | (CreatorActionActor & {
      hasTwitchLinked: false
      twitchAccount?: never
    })

type OwnedQueueActionAccess = CreatorToolsActionAccess & {
  queue: Doc<"viewerQueues">
}

type OwnedQueueEntryActionAccess = CreatorToolsActionAccess & {
  entry: Doc<"viewerQueueEntries">
  queue: Doc<"viewerQueues">
}

async function getCreatorActionActor(
  ctx: ActionCtx
): Promise<CreatorActionActor> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("You must be signed in to manage Play With Viewers.")
  }

  const user: Doc<"users"> | null = await ctx.runQuery(
    internal.queries.staff.internal.getUserByClerkUserId,
    {
      clerkUserId: identity.subject,
    }
  )

  if (!user) {
    throw new Error("Unable to resolve your creator account.")
  }

  const [billingState, creatorAccount]: [
    BillingStatePlanLike | null,
    Doc<"creatorAccounts"> | null,
  ] = await Promise.all([
    ctx.runQuery(internal.queries.billing.resolution.resolveUserPlanState, {
      userId: user._id,
    }),
    ctx.runQuery(internal.queries.creator.internal.getCreatorAccountByUserId, {
      userId: user._id,
    }),
  ])

  if (
    !hasCreatorWorkspaceAccess({
      fallbackPlanKey: user.plan,
      hasCreatorAccount: Boolean(creatorAccount),
      state: billingState,
      userRole: user.role,
    })
  ) {
    throw new Error(
      "Creator workspace access is required for Play With Viewers."
    )
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

  const clerkUser = await getClerkBackendClient().users.getUser(
    actor.clerkUserId
  )
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
): Promise<OwnedQueueActionAccess> {
  const actor = await requireCreatorToolsActionAccess(ctx)
  const queue: Doc<"viewerQueues"> = await ctx.runQuery(
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
): Promise<OwnedQueueEntryActionAccess> {
  const actor = await requireCreatorToolsActionAccess(ctx)
  const entry: Doc<"viewerQueueEntries"> | null = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueEntryById,
    {
      entryId,
    }
  )

  if (!entry) {
    throw new Error("Queue entry not found")
  }

  const queue: Doc<"viewerQueues"> = await ctx.runQuery(
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
