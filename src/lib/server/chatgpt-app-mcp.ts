import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  IsomorphicHeaders,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { getAppPublicOrigin, getCodstatsWidgetTemplateUrl } from "@/lib/server/app-public-origin";
import {
  CHATGPT_APP_ERROR_CODES,
  CHATGPT_APP_VIEWS,
  createChatGptAppErrorPayload,
  createChatGptAppSuccessPayload,
  type ChatGptAppErrorCode,
  type ChatGptAppErrorPayload,
  type ChatGptAppSuccessPayload,
} from "@/lib/server/chatgpt-app-contract";
import { CHATGPT_APP_TOOL_SECURITY_SCHEMES } from "@/lib/server/chatgpt-app-scopes";

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

type ContractSuccess = ChatGptAppSuccessPayload<Record<string, unknown>>;
type ContractError = ChatGptAppErrorPayload;

type ApiCallResult =
  | {
      ok: true;
      payload: ContractSuccess;
    }
  | {
      ok: false;
      result: CallToolResult;
    };

const NO_AUTH_SECURITY_SCHEMES = [{ type: "noauth" }] as const;

function buildTextContent(text: string): Array<{ type: "text"; text: string }> {
  return [{ type: "text", text }];
}

function buildToolError(
  code: ChatGptAppErrorCode,
  message: string,
  wwwAuthenticate?: string,
): CallToolResult {
  return {
    isError: true,
    structuredContent: createChatGptAppErrorPayload(code, message),
    content: buildTextContent(message),
    _meta: wwwAuthenticate
      ? {
          "mcp/www_authenticate": [wwwAuthenticate],
        }
      : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getHeaderValue(
  headers: IsomorphicHeaders | undefined,
  targetHeaderName: string,
) {
  if (!headers) {
    return null;
  }

  const expectedHeaderName = targetHeaderName.toLowerCase();

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() !== expectedHeaderName) {
      continue;
    }

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value ?? null;
  }

  return null;
}

function resolveApiOrigin(extra: ToolExtra) {
  return extra.requestInfo?.url?.origin ?? getAppPublicOrigin();
}

function parseContractSuccess(payload: Record<string, unknown>): ContractSuccess | null {
  const view = payload.view;
  const data = payload.data;
  const meta = asRecord(payload.meta);

  if (
    payload.ok === true &&
    typeof view === "string" &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof meta?.generatedAt === "number"
  ) {
    return payload as ContractSuccess;
  }

  return null;
}

function parseContractError(payload: Record<string, unknown>): ContractError | null {
  const error = asRecord(payload.error);
  const meta = asRecord(payload.meta);

  if (
    payload.ok === false &&
    typeof error?.code === "string" &&
    typeof error?.message === "string" &&
    typeof meta?.generatedAt === "number"
  ) {
    return payload as ContractError;
  }

  return null;
}

function summarizeContractView(payload: ContractSuccess) {
  switch (payload.view) {
    case CHATGPT_APP_VIEWS.uiOpen:
      return "Opened CodStats.";
    case CHATGPT_APP_VIEWS.sessionCurrent:
      return payload.data.active === false
        ? "No active session is currently running."
        : "Loaded your active session.";
    case CHATGPT_APP_VIEWS.sessionLast:
      return payload.data.found === false
        ? "No completed session was found yet."
        : "Loaded your last completed session.";
    case CHATGPT_APP_VIEWS.matchesHistory:
      return "Loaded match history.";
    case CHATGPT_APP_VIEWS.matchesDetail:
      return "Loaded match details.";
    case CHATGPT_APP_VIEWS.rankLadder:
      return "Loaded rank ladder ranges.";
    case CHATGPT_APP_VIEWS.rankProgress:
      return "Loaded rank progress.";
    case CHATGPT_APP_VIEWS.settings:
      return "Loaded CodStats settings.";
    default:
      return "Loaded CodStats data.";
  }
}

async function requestContractApi(
  extra: ToolExtra,
  endpointPath: string,
  init?: RequestInit,
): Promise<ApiCallResult> {
  const apiOrigin = resolveApiOrigin(extra);
  const endpointUrl = new URL(endpointPath, apiOrigin);
  const authorization = getHeaderValue(extra.requestInfo?.headers, "authorization");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(endpointUrl, {
      method: init?.method ?? "GET",
      cache: "no-store",
      signal: extra.signal,
      headers,
      body: init?.body,
    });
  } catch (error) {
    return {
      ok: false,
      result: buildToolError(
        CHATGPT_APP_ERROR_CODES.internal,
        error instanceof Error ? error.message : "Unable to reach CodStats API.",
      ),
    };
  }

  let payloadRecord: Record<string, unknown> | null = null;

  try {
    payloadRecord = asRecord(await response.json());
  } catch {
    payloadRecord = null;
  }

  const parsedSuccess = payloadRecord ? parseContractSuccess(payloadRecord) : null;
  const parsedError = payloadRecord ? parseContractError(payloadRecord) : null;

  if (response.ok && parsedSuccess) {
    return {
      ok: true,
      payload: parsedSuccess,
    };
  }

  if (parsedError) {
    return {
      ok: false,
      result: buildToolError(
        parsedError.error.code,
        parsedError.error.message,
        response.headers.get("www-authenticate") ?? undefined,
      ),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      result: buildToolError(
        CHATGPT_APP_ERROR_CODES.internal,
        `CodStats API request failed with status ${response.status}.`,
        response.headers.get("www-authenticate") ?? undefined,
      ),
    };
  }

  return {
    ok: false,
    result: buildToolError(
      CHATGPT_APP_ERROR_CODES.internal,
      "CodStats API returned malformed contract payload.",
    ),
  };
}

async function fetchContractToolPayload(
  extra: ToolExtra,
  endpointPath: string,
  init?: RequestInit,
): Promise<CallToolResult | { structuredContent: ContractSuccess; content: { type: "text"; text: string }[] }> {
  const result = await requestContractApi(extra, endpointPath, init);

  if (!result.ok) {
    return result.result;
  }

  return {
    structuredContent: result.payload,
    content: buildTextContent(summarizeContractView(result.payload)),
  };
}

function createToolMeta(args: {
  includeWidget?: boolean;
  securitySchemes?: readonly unknown[];
}) {
  const widgetTemplateUrl = getCodstatsWidgetTemplateUrl();

  return {
    ...(args.includeWidget
      ? {
          ui: {
            resourceUri: widgetTemplateUrl,
          },
          "openai/outputTemplate": widgetTemplateUrl,
        }
      : {}),
    ...(args.securitySchemes
      ? {
          securitySchemes: args.securitySchemes,
        }
      : {}),
  };
}

function withHistoryQuery(params: { cursor?: string; limit?: number }) {
  const queryParams = new URLSearchParams();

  if (params.cursor && params.cursor.trim().length > 0) {
    queryParams.set("cursor", params.cursor);
  }

  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    const clampedLimit = Math.min(15, Math.max(1, Math.trunc(params.limit)));
    queryParams.set("limit", String(clampedLimit));
  }

  const queryString = queryParams.toString();
  return queryString.length > 0
    ? `/api/app/stats/matches?${queryString}`
    : "/api/app/stats/matches";
}

export function createChatGptAppMcpServer() {
  const server = new McpServer({
    name: "codstats-app",
    version: "2.0.0",
  });

  registerAppTool(
    server,
    "codstats_open",
    {
      title: "Open CodStats",
      description: "Open the CodStats app widget.",
      inputSchema: {
        tab: z.enum(["overview", "matches", "rank", "settings"]).optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        includeWidget: true,
        securitySchemes: NO_AUTH_SECURITY_SCHEMES,
      }),
    },
    async ({ tab }) => {
      const payload = createChatGptAppSuccessPayload(CHATGPT_APP_VIEWS.uiOpen, {
        tab: tab ?? "overview",
      });

      return {
        structuredContent: payload,
        content: buildTextContent("Opened CodStats."),
      };
    },
  );

  registerAppTool(
    server,
    "codstats_get_current_session",
    {
      title: "Get Current Session",
      description: "Fetch only the currently active CodStats session.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        includeWidget: true,
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.currentSession,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/stats/session/current");
    },
  );

  registerAppTool(
    server,
    "codstats_get_last_session",
    {
      title: "Get Last Session",
      description: "Fetch the most recent completed CodStats session.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        includeWidget: true,
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.lastSession,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/stats/session/last");
    },
  );

  registerAppTool(
    server,
    "codstats_get_match_history",
    {
      title: "Get Match History",
      description: "Fetch paginated match history using cursor-based pagination.",
      inputSchema: {
        cursor: z.string().optional(),
        limit: z.number().int().positive().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        includeWidget: true,
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.matchHistory,
      }),
    },
    async ({ cursor, limit }, extra) => {
      return fetchContractToolPayload(extra, withHistoryQuery({ cursor, limit }));
    },
  );

  registerAppTool(
    server,
    "codstats_get_match",
    {
      title: "Get Match Detail",
      description: "Fetch a single match by match id.",
      inputSchema: {
        matchId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.matchDetail,
      }),
    },
    async ({ matchId }, extra) => {
      return fetchContractToolPayload(
        extra,
        `/api/app/stats/matches/${encodeURIComponent(matchId)}`,
      );
    },
  );

  registerAppTool(
    server,
    "codstats_get_rank_ladder",
    {
      title: "Get Rank Ladder",
      description: "Fetch explicit SR ranges for the rank ladder.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.rankLadder,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/stats/rank/ladder");
    },
  );

  registerAppTool(
    server,
    "codstats_get_rank_progress",
    {
      title: "Get Rank Progress",
      description: "Fetch current rank position and SR movement targets.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        includeWidget: true,
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.rankProgress,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/stats/rank/progress");
    },
  );

  registerAppTool(
    server,
    "codstats_get_settings",
    {
      title: "Get Settings",
      description: "Fetch CodStats app settings and connection status.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
      _meta: createToolMeta({
        includeWidget: true,
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.profile,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/profile");
    },
  );

  registerAppTool(
    server,
    "codstats_disconnect",
    {
      title: "Disconnect CodStats",
      description: "Disconnect the current ChatGPT app connection.",
      inputSchema: {
        confirm: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: true,
      },
      _meta: createToolMeta({
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.disconnect,
      }),
    },
    async ({ confirm }, extra) => {
      if (confirm !== true) {
        return buildToolError(
          CHATGPT_APP_ERROR_CODES.validation,
          "Disconnect requires confirm=true.",
        );
      }

      return fetchContractToolPayload(extra, "/api/app/disconnect", {
        method: "POST",
        body: "{}",
      });
    },
  );

  return server;
}
