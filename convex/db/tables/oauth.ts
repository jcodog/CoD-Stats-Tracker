import { defineTable } from "convex/server";
import { v } from "convex/values";

export const oauthAuthCodes = defineTable({
  userId: v.id("users"),
  codeHash: v.string(),
  stateHash: v.string(),
  sessionId: v.string(),
  redirectUri: v.string(),
  scopes: v.array(v.string()),
  codeChallenge: v.optional(v.string()),
  codeChallengeMethod: v.optional(v.literal("S256")),
  expiresAt: v.number(),
  createdAt: v.number(),
})
  .index("by_codeHash", ["codeHash"])
  .index("by_session_state", ["sessionId", "stateHash"])
  .index("by_expiresAt", ["expiresAt"]);

export const oauthTokens = defineTable({
  userId: v.id("users"),
  provider: v.literal("chatgpt_app"),
  refreshTokenHash: v.string(),
  refreshTokenExpiresAt: v.number(),
  scopes: v.array(v.string()),
  revokedAt: v.optional(v.number()),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
})
  .index("by_refreshTokenHash", ["refreshTokenHash"])
  .index("by_user_provider", ["userId", "provider"])
  .index("by_expiresAt", ["refreshTokenExpiresAt"]);
