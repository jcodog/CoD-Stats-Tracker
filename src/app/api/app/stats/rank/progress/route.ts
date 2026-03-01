import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import {
  CHATGPT_APP_ERROR_CODES,
  CHATGPT_APP_VIEWS,
  createChatGptAppErrorPayload,
  createChatGptAppSuccessPayload,
} from "@/lib/server/chatgpt-app-contract";
import {
  APP_API_NO_STORE_HEADERS,
  requireAuthenticatedAppRequest,
  touchChatGptConnectionLastUsedAt,
} from "@/lib/server/chatgpt-app-auth";
import { getCodstatsRankLadder, getCodstatsRankProgress } from "@/lib/server/codstats-rank";
import { CHATGPT_APP_ROUTE_REQUIRED_SCOPES } from "@/lib/server/chatgpt-app-scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankProgressRouteDeps = {
  authenticate: typeof requireAuthenticatedAppRequest;
  getActiveSessionByDiscordId: (discordId: string) => Promise<unknown>;
  getLastCompletedSessionByDiscordId: (discordId: string) => Promise<unknown>;
  touchConnectionLastUsedAt: typeof touchChatGptConnectionLastUsedAt;
};

const defaultDeps: RankProgressRouteDeps = {
  authenticate: requireAuthenticatedAppRequest,
  getActiveSessionByDiscordId: async (discordId) =>
    fetchQuery((api as any).queries.chatgpt.getActiveSessionByDiscordId, {
      discordId,
    }),
  getLastCompletedSessionByDiscordId: async (discordId) =>
    fetchQuery((api as any).queries.chatgpt.getLastCompletedSessionByDiscordId, {
      discordId,
    }),
  touchConnectionLastUsedAt: touchChatGptConnectionLastUsedAt,
};

function asRecord(value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readSrCurrent(value: Record<string, unknown> | null) {
  const srCurrent = value?.srCurrent;
  if (typeof srCurrent !== "number" || !Number.isFinite(srCurrent)) {
    return null;
  }

  return srCurrent;
}

export async function handleRankProgressGet(
  request: Request,
  deps: RankProgressRouteDeps = defaultDeps,
) {
  const authResult = await deps.authenticate(
    request,
    CHATGPT_APP_ROUTE_REQUIRED_SCOPES.rankProgress,
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  const [activeSessionRaw, lastSessionRaw] = await Promise.all([
    deps.getActiveSessionByDiscordId(authResult.auth.user.discordId),
    deps.getLastCompletedSessionByDiscordId(authResult.auth.user.discordId),
  ]);

  await deps.touchConnectionLastUsedAt(authResult.auth.user._id);

  const activeSession = asRecord(activeSessionRaw);
  const lastSession = asRecord(lastSessionRaw);

  const currentSr = readSrCurrent(activeSession) ?? readSrCurrent(lastSession);

  if (currentSr === null) {
    return NextResponse.json(
      createChatGptAppErrorPayload(
        CHATGPT_APP_ERROR_CODES.notFound,
        "rank progress unavailable because no session SR data exists",
      ),
      {
        status: 404,
        headers: APP_API_NO_STORE_HEADERS,
      },
    );
  }

  const ladder = getCodstatsRankLadder();
  const progress = getCodstatsRankProgress(currentSr, ladder);

  return NextResponse.json(
    createChatGptAppSuccessPayload(CHATGPT_APP_VIEWS.rankProgress, progress),
    {
      headers: APP_API_NO_STORE_HEADERS,
    },
  );
}

export async function GET(request: Request) {
  return handleRankProgressGet(request);
}
