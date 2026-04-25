import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessions = defineTable({
  uuid: v.string(),
  userId: v.string(),
  ownerUserId: v.optional(v.id("users")),
  activisionUsernameId: v.optional(v.id("activisionUsernames")),
  activisionUsernameSnapshot: v.optional(v.string()),
  codTitle: v.string(),
  titleKey: v.optional(v.string()),
  titleLabelSnapshot: v.optional(v.string()),
  season: v.number(),
  titleSeasonKey: v.optional(v.string()),
  wins: v.number(),
  losses: v.number(),
  kills: v.number(),
  deaths: v.number(),
  startSr: v.number(),
  currentSr: v.number(),
  matchCount: v.optional(v.number()),
  lastMatchLoggedAt: v.optional(v.number()),
  streak: v.number(),
  bestStreak: v.number(),
  startedAt: v.number(),
  archivedReason: v.optional(
    v.union(
      v.literal("title_rollover"),
      v.literal("season_rollover"),
      v.literal("title_and_season_rollover"),
    ),
  ),
  endedAt: v.union(v.null(), v.number()), // null if session is active
})
  .index("by_user", ["userId"])
  .index("by_user_cod_season", ["userId", "codTitle", "season"]) // group sessions by user & game title & season
  .index("by_endedAt", ["endedAt"])
  .index("by_owner_startedAt", ["ownerUserId", "startedAt"])
  .index("by_owner_titleSeason", ["ownerUserId", "titleSeasonKey"])
  .index("by_owner_titleSeason_username", [
    "ownerUserId",
    "titleSeasonKey",
    "activisionUsernameSnapshot",
  ])
  .index("by_uuid", ["uuid"]);
