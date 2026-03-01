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

type LastSessionRouteDeps = {
  authenticate: typeof requireAuthenticatedAppRequest;
  getLastCompletedSessionByDiscordId: (discordId: string) => Promise<unknown>;
  touchConnectionLastUsedAt: typeof touchChatGptConnectionLastUsedAt;
};

const defaultDeps: LastSessionRouteDeps = {
  authenticate: requireAuthenticatedAppRequest,
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

export async function handleLastSessionGet(
  request: Request,
  deps: LastSessionRouteDeps = defaultDeps,
) {
  const authResult = await deps.authenticate(
    request,
    CHATGPT_APP_ROUTE_REQUIRED_SCOPES.sessionLast,
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  const lastSession = await deps.getLastCompletedSessionByDiscordId(
    authResult.auth.user.discordId,
  );

  await deps.touchConnectionLastUsedAt(authResult.auth.user._id);

  const sessionRecord = asRecord(lastSession);

  return NextResponse.json(
    createChatGptAppSuccessPayload(CHATGPT_APP_VIEWS.sessionLast, {
      found: sessionRecord !== null,
      ...(sessionRecord ? { session: sessionRecord } : {}),
    }),
    {
      headers: APP_API_NO_STORE_HEADERS,
    },
  );
}

export async function GET(request: Request) {
  return handleLastSessionGet(request);
}
