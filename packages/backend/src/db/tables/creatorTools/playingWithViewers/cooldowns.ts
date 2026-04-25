import { defineTable } from "convex/server"
import { v } from "convex/values"

export const viewerQueueCooldowns = defineTable({
  queueId: v.id("viewerQueues"),
  platform: v.union(v.literal("discord"), v.literal("twitch")),
  platformUserId: v.string(),
  command: v.union(v.literal("join")),
  lastUsedAt: v.number(),
}).index("by_queueId_platformUserId_command", [
  "queueId",
  "platform",
  "platformUserId",
  "command",
])
