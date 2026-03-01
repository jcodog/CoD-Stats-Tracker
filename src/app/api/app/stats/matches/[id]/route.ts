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
import { CHATGPT_APP_ROUTE_REQUIRED_SCOPES } from "@/lib/server/chatgpt-app-scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MatchDetailRouteDeps = {
  authenticate: typeof requireAuthenticatedAppRequest;
  getMatchById: (discordId: string, matchId: string) => Promise<unknown>;
  touchConnectionLastUsedAt: typeof touchChatGptConnectionLastUsedAt;
};

const defaultDeps: MatchDetailRouteDeps = {
  authenticate: requireAuthenticatedAppRequest,
  getMatchById: async (discordId, matchId) =>
    fetchQuery((api as any).queries.chatgpt.getMatchById, {
      discordId,
      matchId,
    }),
  touchConnectionLastUsedAt: touchChatGptConnectionLastUsedAt,
};

function asRecord(value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function handleMatchDetailGet(
  request: Request,
  matchId: string,
  deps: MatchDetailRouteDeps = defaultDeps,
) {
  const normalizedMatchId = matchId.trim();

  if (normalizedMatchId.length === 0) {
    return NextResponse.json(
      createChatGptAppErrorPayload(
        CHATGPT_APP_ERROR_CODES.validation,
        "match id is required",
      ),
      {
        status: 400,
        headers: APP_API_NO_STORE_HEADERS,
      },
    );
  }

  const authResult = await deps.authenticate(
    request,
    CHATGPT_APP_ROUTE_REQUIRED_SCOPES.matches,
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  const match = asRecord(
    await deps.getMatchById(authResult.auth.user.discordId, normalizedMatchId),
  );

  await deps.touchConnectionLastUsedAt(authResult.auth.user._id);

  if (!match) {
    return NextResponse.json(
      createChatGptAppErrorPayload(
        CHATGPT_APP_ERROR_CODES.notFound,
        "match not found",
      ),
      {
        status: 404,
        headers: APP_API_NO_STORE_HEADERS,
      },
    );
  }

  return NextResponse.json(
    createChatGptAppSuccessPayload(CHATGPT_APP_VIEWS.matchesDetail, {
      match,
    }),
    {
      headers: APP_API_NO_STORE_HEADERS,
    },
  );
}

type MatchDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: MatchDetailRouteContext) {
  const { id } = await context.params;
  return handleMatchDetailGet(request, id);
}
