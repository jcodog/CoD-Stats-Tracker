import {
  CHATGPT_APP_VIEWS,
  createChatGptAppSuccessResponse,
  withChatGptAppRoute,
} from "@/lib/server/chatgpt-app-contract";
import {
  requireAuthenticatedAppRequest,
  touchChatGptConnectionLastUsedAt,
} from "@/lib/server/chatgpt-app-auth";
import { CHATGPT_APP_ROUTE_REQUIRED_SCOPES } from "@/lib/server/chatgpt-app-scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRouteDeps = {
  authenticate: typeof requireAuthenticatedAppRequest;
  touchConnectionLastUsedAt: typeof touchChatGptConnectionLastUsedAt;
};

const defaultDeps: ProfileRouteDeps = {
  authenticate: requireAuthenticatedAppRequest,
  touchConnectionLastUsedAt: touchChatGptConnectionLastUsedAt,
};

export async function handleProfileGet(
  request: Request,
  deps: ProfileRouteDeps = defaultDeps,
) {
  const authResult = await deps.authenticate(
    request,
    CHATGPT_APP_ROUTE_REQUIRED_SCOPES.profile,
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  await deps.touchConnectionLastUsedAt(authResult.auth.user._id);

  const normalizedUserName =
    typeof authResult.auth.user.name === "string" &&
    authResult.auth.user.name.trim().length > 0
      ? authResult.auth.user.name
      : "CodStats User";

  const normalizedPlan = authResult.auth.user.plan === "premium" ? "premium" : "free";

  const chatgptLinked =
    authResult.auth.user.chatgptLinked === true &&
    authResult.auth.user.connectionStatus === "active";

  return createChatGptAppSuccessResponse(CHATGPT_APP_VIEWS.settings, {
      connected: true,
      chatgptLinked,
      user: {
        name: normalizedUserName,
        plan: normalizedPlan,
      },
    });
}

export const GET = withChatGptAppRoute("api.app.profile.get", async (request) =>
  handleProfileGet(request),
);
