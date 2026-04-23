import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { QueuePlatform } from "./playingWithViewers"

type IdentityDataCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">
type QueueEntryDoc = Doc<"viewerQueueEntries">

export type ResolvedQueueIdentity = {
  linkedUserId?: Id<"users">
  platform: QueuePlatform
  platformUserId: string
}

export function normalizePlatformUserId(platformUserId: string): string {
  const normalized = platformUserId.trim()

  if (!normalized) {
    throw new Error("platformUserId is required")
  }

  return normalized
}

export async function resolveQueueIdentity(
  ctx: IdentityDataCtx,
  args: {
    platform: QueuePlatform
    platformUserId: string
  }
): Promise<ResolvedQueueIdentity> {
  const platformUserId = normalizePlatformUserId(args.platformUserId)
  const connection = await ctx.db
    .query("connectedAccounts")
    .withIndex("by_provider_and_providerUserId", (query) =>
      query
        .eq("provider", args.platform)
        .eq("providerUserId", platformUserId)
    )
    .unique()

  return {
    linkedUserId: connection?.userId,
    platform: args.platform,
    platformUserId,
  }
}

export async function findQueueEntryForIdentity(
  ctx: IdentityDataCtx,
  args: {
    linkedUserId?: Id<"users">
    platform: QueuePlatform
    platformUserId: string
    queueId: Id<"viewerQueues">
  }
): Promise<QueueEntryDoc | null> {
  const directEntry = await ctx.db
    .query("viewerQueueEntries")
    .withIndex("by_queueId_and_platformUserId", (query) =>
      query
        .eq("queueId", args.queueId)
        .eq("platform", args.platform)
        .eq("platformUserId", args.platformUserId)
    )
    .unique()

  if (directEntry) {
    return directEntry
  }

  if (!args.linkedUserId) {
    return null
  }

  return await ctx.db
    .query("viewerQueueEntries")
    .withIndex("by_queueId_and_linkedUserId", (query) =>
      query
        .eq("queueId", args.queueId)
        .eq("linkedUserId", args.linkedUserId)
    )
    .unique()
}

export async function getQueuePositionForIdentity(
  ctx: IdentityDataCtx,
  args: {
    platform: QueuePlatform
    platformUserId: string
    queueId: Id<"viewerQueues">
  }
) {
  const identity = await resolveQueueIdentity(ctx, args)
  const entries = await ctx.db
    .query("viewerQueueEntries")
    .withIndex("by_queueId_and_joinedAt", (query) =>
      query.eq("queueId", args.queueId)
    )
    .collect()

  const position = entries.findIndex((entry) => {
    if (
      entry.platform === identity.platform &&
      entry.platformUserId === identity.platformUserId
    ) {
      return true
    }

    return Boolean(
      identity.linkedUserId &&
        entry.linkedUserId &&
        entry.linkedUserId === identity.linkedUserId
    )
  })

  return {
    entries,
    identity,
    position: position === -1 ? null : position + 1,
  }
}
