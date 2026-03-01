import { NextResponse } from "next/server";

import {
  CHATGPT_APP_VIEWS,
  createChatGptAppSuccessPayload,
} from "@/lib/server/chatgpt-app-contract";
import {
  APP_API_NO_STORE_HEADERS,
  requireAuthenticatedAppRequest,
  touchChatGptConnectionLastUsedAt,
} from "@/lib/server/chatgpt-app-auth";
import { getCodstatsRankLadder } from "@/lib/server/codstats-rank";
import { CHATGPT_APP_ROUTE_REQUIRED_SCOPES } from "@/lib/server/chatgpt-app-scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankLadderRouteDeps = {
  authenticate: typeof requireAuthenticatedAppRequest;
  touchConnectionLastUsedAt: typeof touchChatGptConnectionLastUsedAt;
};

const defaultDeps: RankLadderRouteDeps = {
  authenticate: requireAuthenticatedAppRequest,
  touchConnectionLastUsedAt: touchChatGptConnectionLastUsedAt,
};

export async function handleRankLadderGet(
  request: Request,
  deps: RankLadderRouteDeps = defaultDeps,
) {
  const authResult = await deps.authenticate(
    request,
    CHATGPT_APP_ROUTE_REQUIRED_SCOPES.rankLadder,
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  await deps.touchConnectionLastUsedAt(authResult.auth.user._id);

  return NextResponse.json(
    createChatGptAppSuccessPayload(
      CHATGPT_APP_VIEWS.rankLadder,
      getCodstatsRankLadder(),
    ),
    {
      headers: APP_API_NO_STORE_HEADERS,
    },
  );
}

export async function GET(request: Request) {
  return handleRankLadderGet(request);
}
