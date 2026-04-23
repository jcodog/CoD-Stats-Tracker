import { v } from "convex/values"
import { internalQuery } from "../../../_generated/server"

export const getNotificationById = internalQuery({
  args: {
    notificationId: v.id("viewerQueueNotifications"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.notificationId)
  },
})

export const getRoundNotifications = internalQuery({
  args: {
    roundId: v.id("viewerQueueRounds"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewerQueueNotifications")
      .withIndex("by_roundId", (query) => query.eq("roundId", args.roundId))
      .collect()
  },
})
