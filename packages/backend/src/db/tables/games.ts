import { defineTable } from "convex/server";
import { v } from "convex/values";

export const games = defineTable({
  sessionId: v.string(), // session uuid reference
  userId: v.string(),
  ownerUserId: v.optional(v.id("users")),
  modeId: v.optional(v.id("rankedModes")),
  mode: v.optional(v.string()),
  outcome: v.union(v.literal("win"), v.literal("loss")),
  kills: v.optional(v.union(v.null(), v.number())),
  deaths: v.optional(v.union(v.null(), v.number())),
  srChange: v.number(),
  lossProtected: v.boolean(),
  mapId: v.optional(v.id("rankedMaps")),
  mapNameSnapshot: v.optional(v.string()),
  teamScore: v.optional(v.union(v.null(), v.number())),
  enemyScore: v.optional(v.union(v.null(), v.number())),
  hillTimeSeconds: v.optional(v.union(v.null(), v.number())),
  plants: v.optional(v.union(v.null(), v.number())),
  defuses: v.optional(v.union(v.null(), v.number())),
  overloads: v.optional(v.union(v.null(), v.number())),
  notes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_session_createdat", ["sessionId", "createdAt"])
  .index("by_user_createdat", ["userId", "createdAt"])
  .index("by_createdat", ["createdAt"]);
