import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import {
  CHATGPT_APP_VIEWS,
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

type CurrentSessionRouteDeps = {
  authenticate: typeof requireAuthenticatedAppRequest;
  getActiveSessionByDiscordId: (discordId: string) => Promise<unknown>;
  touchConnectionLastUsedAt: typeof touchChatGptConnectionLastUsedAt;
};

const defaultDeps: CurrentSessionRouteDeps = {
  authenticate: requireAuthenticatedAppRequest,
  getActiveSessionByDiscordId: async (discordId) =>
    fetchQuery((api as any).queries.chatgpt.getActiveSessionByDiscordId, {
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

export async function handleCurrentSessionGet(
  request: Request,
  deps: CurrentSessionRouteDeps = defaultDeps,
) {
  const authResult = await deps.authenticate(
    request,
    CHATGPT_APP_ROUTE_REQUIRED_SCOPES.sessionCurrent,
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  const activeSession = await deps.getActiveSessionByDiscordId(
    authResult.auth.user.discordId,
  );

  await deps.touchConnectionLastUsedAt(authResult.auth.user._id);

  const sessionRecord = asRecord(activeSession);

  return NextResponse.json(
    createChatGptAppSuccessPayload(CHATGPT_APP_VIEWS.sessionCurrent, {
      active: sessionRecord !== null,
      ...(sessionRecord ? { session: sessionRecord } : {}),
    }),
    {
      headers: APP_API_NO_STORE_HEADERS,
    },
  );
}

export async function GET(request: Request) {
  return handleCurrentSessionGet(request);
}
