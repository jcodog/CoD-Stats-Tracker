"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { action } from "../../../_generated/server"
import {
  requireOwnedQueueActionAccess,
  requireOwnedQueueEntryActionAccess,
} from "../../../lib/creatorToolsActionAuth"

const rankValidator = v.union(
  v.literal("bronze"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("platinum"),
  v.literal("diamond"),
  v.literal("crimson"),
  v.literal("iridescent"),
  v.literal("top250")
)

const inviteModeValidator = v.union(
  v.literal("discord_dm"),
  v.literal("manual_creator_contact")
)

export const updateQueueSettings = action({
  args: {
    queueId: v.id("viewerQueues"),
    title: v.string(),
    creatorDisplayName: v.string(),
    gameLabel: v.string(),
    creatorMessage: v.optional(v.string()),
    rulesText: v.optional(v.string()),
    playersPerBatch: v.number(),
    matchesPerViewer: v.number(),
    minRank: rankValidator,
    maxRank: rankValidator,
    inviteMode: inviteModeValidator,
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.updateQueueSettings,
      args
    )
  },
})

export const setQueueActive = action({
  args: {
    queueId: v.id("viewerQueues"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueActive,
      args
    )
  },
})

export const clearQueue = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.clearQueue,
      args
    )
  },
})

export const removeQueueEntry = action({
  args: {
    entryId: v.id("viewerQueueEntries"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueEntryActionAccess(ctx, args.entryId)

    return await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.removeQueueEntry,
      args
    )
  },
})
