"use node"

import type { AppPlanKey, BillingStatePlanLike } from "../../billingAccess"
import { hasCreatorWorkspaceAccess } from "../../creator/program"
import { isPlayWithViewersTwitchEnabled } from "./config"

export type TwitchAccount = {
  displayName?: string
  provider: "discord" | "twitch"
  providerLogin?: string
  providerUserId: string
}

export type CreatorActionActor = {
  billingState: BillingStatePlanLike | null
  clerkUserId: string
  user: {
    _id: string
    plan?: AppPlanKey | null
    role?: string | null
  }
}

export type CreatorToolsActionAccess =
  | (CreatorActionActor & {
      hasTwitchLinked: true
      twitchAccount: TwitchAccount
    })
  | (CreatorActionActor & {
      hasTwitchLinked: false
      twitchAccount?: never
    })

export type OwnedQueueActionAccess = CreatorToolsActionAccess & {
  queue: {
    creatorUserId: string
  }
}

export type OwnedQueueEntryActionAccess = CreatorToolsActionAccess & {
  entry: {
    queueId: string
  }
  queue: {
    creatorUserId: string
  }
}

export async function resolveCreatorToolsActionAccess(args: {
  billingState: BillingStatePlanLike | null
  clerkUserId: string
  creatorAccount: { _id: string } | null
  requireTwitchLinked?: boolean
  twitchAccount?: TwitchAccount | null
  user: CreatorActionActor["user"]
}): Promise<CreatorToolsActionAccess> {
  if (
    !hasCreatorWorkspaceAccess({
      fallbackPlanKey: args.user.plan,
      hasCreatorAccount: Boolean(args.creatorAccount),
      state: args.billingState,
      userRole: args.user.role,
    })
  ) {
    throw new Error(
      "Creator workspace access is required for Play With Viewers."
    )
  }

  const requireTwitchLinked = args.requireTwitchLinked ?? true

  if (!requireTwitchLinked || !isPlayWithViewersTwitchEnabled()) {
    return {
      billingState: args.billingState,
      clerkUserId: args.clerkUserId,
      hasTwitchLinked: false,
      user: args.user,
    }
  }

  if (!args.twitchAccount) {
    throw new Error("Link Twitch to use Play With Viewers creator tools.")
  }

  return {
    billingState: args.billingState,
    clerkUserId: args.clerkUserId,
    hasTwitchLinked: true,
    twitchAccount: args.twitchAccount,
    user: args.user,
  }
}

export function assertOwnedQueueActionAccess<
  TQueue extends { creatorUserId: string },
>(
  actor: CreatorToolsActionAccess,
  queue: TQueue
): CreatorToolsActionAccess & { queue: TQueue } {
  if (queue.creatorUserId !== actor.user._id) {
    throw new Error("You do not have access to this queue.")
  }

  return {
    ...actor,
    queue,
  }
}

export function assertOwnedQueueEntryActionAccess<
  TEntry extends { queueId: string },
  TQueue extends { creatorUserId: string },
>(
  actor: CreatorToolsActionAccess,
  entry: TEntry,
  queue: TQueue
): CreatorToolsActionAccess & { entry: TEntry; queue: TQueue } {
  if (queue.creatorUserId !== actor.user._id) {
    throw new Error("You do not have access to this queue entry.")
  }

  return {
    ...actor,
    entry,
    queue,
  }
}
