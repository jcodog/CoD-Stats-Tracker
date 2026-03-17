import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { hasCreatorAccessFromState } from "./billingAccess"
import { buildResolvedBillingState } from "../queries/billing/resolution"

type CreatorToolsDataCtx =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">

async function getCurrentUserRecord(ctx: CreatorToolsDataCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("You must be signed in to manage Play With Viewers.")
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (query) => query.eq("clerkUserId", identity.subject))
    .unique()

  if (!user) {
    throw new Error("Unable to resolve your creator account.")
  }

  return {
    clerkUserId: identity.subject,
    user,
  }
}

export async function requireCreatorToolsViewerAccess(ctx: CreatorToolsDataCtx) {
  const actor = await getCurrentUserRecord(ctx)
  const billingState = await buildResolvedBillingState(ctx, actor.user)

  if (
    !hasCreatorAccessFromState({
      fallbackPlanKey: actor.user.plan,
      state: billingState,
    })
  ) {
    throw new Error("Creator plan access is required for Play With Viewers.")
  }

  return {
    ...actor,
    billingState,
  }
}

export async function requireOwnedCreatorQueueAccess(
  ctx: CreatorToolsDataCtx,
  queueId: Id<"viewerQueues">
) {
  const actor = await requireCreatorToolsViewerAccess(ctx)
  const queue = await ctx.db.get(queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  if (queue.creatorUserId !== actor.user._id) {
    throw new Error("You do not have access to this queue.")
  }

  return {
    ...actor,
    queue,
  }
}

export async function requireOwnedCreatorQueueEntryAccess(
  ctx: CreatorToolsDataCtx,
  entryId: Id<"viewerQueueEntries">
) {
  const actor = await requireCreatorToolsViewerAccess(ctx)
  const entry = await ctx.db.get(entryId)

  if (!entry) {
    throw new Error("Queue entry not found")
  }

  const queue = await ctx.db.get(entry.queueId)

  if (!queue) {
    throw new Error("Queue not found")
  }

  if (queue.creatorUserId !== actor.user._id) {
    throw new Error("You do not have access to this queue entry.")
  }

  return {
    ...actor,
    entry,
    queue,
  }
}
