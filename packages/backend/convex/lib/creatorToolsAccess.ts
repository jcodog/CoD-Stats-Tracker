import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { buildResolvedBillingState } from "../queries/billing/resolution"
import { hasCreatorWorkspaceAccess } from "./creatorProgram"

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
    .withIndex("by_clerkUserId", (query) =>
      query.eq("clerkUserId", identity.subject)
    )
    .unique()

  if (!user) {
    throw new Error("Unable to resolve your creator account.")
  }

  return {
    clerkUserId: identity.subject,
    user,
  }
}

export async function requireCreatorToolsViewerAccess(
  ctx: CreatorToolsDataCtx
) {
  const actor = await getCurrentUserRecord(ctx)
  const [billingState, creatorAccount] = await Promise.all([
    buildResolvedBillingState(ctx, actor.user),
    ctx.db
      .query("creatorAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", actor.user._id))
      .unique(),
  ])

  if (
    !hasCreatorWorkspaceAccess({
      fallbackPlanKey: actor.user.plan,
      hasCreatorAccount: Boolean(creatorAccount),
      state: billingState,
      userRole: actor.user.role,
    })
  ) {
    throw new Error(
      "Creator workspace access is required for Play With Viewers."
    )
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
