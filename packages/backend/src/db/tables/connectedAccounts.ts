import { defineTable } from "convex/server"
import { v } from "convex/values"

export const connectedAccounts = defineTable({
  userId: v.id("users"),
  provider: v.union(v.literal("discord"), v.literal("twitch")),
  providerUserId: v.string(),
  providerLogin: v.optional(v.string()),
  displayName: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_and_provider", ["userId", "provider"])
  .index("by_provider_and_providerUserId", ["provider", "providerUserId"])
