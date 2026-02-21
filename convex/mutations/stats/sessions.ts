import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const createSession = mutation({
  args: {
    uuid: v.string(),
    userId: v.string(),
    codTitle: v.string(),
    season: v.number(),
    startSr: v.number(),
  },
  handler: async (ctx, args) => {
    const { uuid, userId, codTitle, season, startSr } = args;
    const now = Date.now();

    const userSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeSessions = userSessions.filter(
      (session) => session.endedAt === null,
    );

    const matchingSession = activeSessions.find(
      (session) => session.codTitle === codTitle && session.season === season,
    );

    const sessionsToClose = matchingSession
      ? activeSessions.filter((session) => session._id !== matchingSession._id)
      : activeSessions;

    for (const session of sessionsToClose) {
      await ctx.db.patch(session._id, { endedAt: now });
    }

    if (matchingSession) {
      return {
        created: false,
        session: matchingSession,
        closedSessionCount: sessionsToClose.length,
      };
    }

    const sessionId = await ctx.db.insert("sessions", {
      uuid,
      userId,
      codTitle,
      season,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      startSr,
      currentSr: startSr,
      streak: 0,
      bestStreak: 0,
      startedAt: now,
      endedAt: null,
    });

    const createdSession = await ctx.db.get(sessionId);
    if (!createdSession) {
      throw new Error("Failed to create session");
    }

    return {
      created: true,
      session: createdSession,
      closedSessionCount: sessionsToClose.length,
    };
  },
});
