import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  IsomorphicHeaders,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  getAppPublicOrigin,
  getCodstatsTemplateResourceUri,
  getCodstatsTemplateUrl,
  type CodstatsTemplateName,
} from "@/lib/server/app-public-origin";
import {
  CHATGPT_APP_ERROR_CODES,
  CHATGPT_APP_VIEWS,
  createChatGptAppErrorPayload,
  createChatGptAppSuccessPayload,
  type ChatGptAppErrorCode,
  type ChatGptAppErrorPayload,
  type ChatGptAppSuccessPayload,
} from "@/lib/server/chatgpt-app-contract";
import {
  getCodstatsTemplateCatalog,
  getCodstatsTemplateResourceMeta,
  renderCodstatsTemplateHtml,
} from "@/lib/server/chatgpt-app-ui-templates";
import { attachCodstatsUiToPayload } from "@/lib/server/chatgpt-app-ui";
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

const TOOL_TEMPLATE_MAP = {
  codstats_open: "widget",
  codstats_get_current_session: "session",
  codstats_get_last_session: "session",
  codstats_get_match_history: "matches",
  codstats_get_rank_progress: "rank",
  codstats_get_settings: "settings",
} as const satisfies Partial<Record<string, CodstatsTemplateName>>;

const CHATGPT_APP_TOOL_NAMES = [
  "codstats_open",
  "codstats_get_current_session",
  "codstats_get_last_session",
  "codstats_get_match_history",
  "codstats_get_match",
  "codstats_get_rank_ladder",
  "codstats_get_rank_progress",
  "codstats_get_settings",
  "codstats_disconnect",
] as const;

type ChatGptAppToolName = (typeof CHATGPT_APP_TOOL_NAMES)[number];

export type ChatGptAppToolTemplateDebugEntry = {
  name: ChatGptAppToolName;
  resourceUri: string | null;
  outputTemplate: string | null;
  hostedTemplateUrl: string | null;
};

function getToolTemplateName(toolName: ChatGptAppToolName): CodstatsTemplateName | null {
  const templateMap =
    TOOL_TEMPLATE_MAP as Partial<Record<ChatGptAppToolName, CodstatsTemplateName>>;
  return templateMap[toolName] ?? null;
}

export function getChatGptAppToolTemplateDebugEntries(requestOrigin?: string) {
  return CHATGPT_APP_TOOL_NAMES.map((toolName) => {
    const templateName = getToolTemplateName(toolName);

    return {
      name: toolName,
      resourceUri: templateName ? getCodstatsTemplateResourceUri(templateName) : null,
      outputTemplate: templateName ? getCodstatsTemplateResourceUri(templateName) : null,
      hostedTemplateUrl: templateName ? getCodstatsTemplateUrl(templateName, requestOrigin) : null,
    } satisfies ChatGptAppToolTemplateDebugEntry;
  });
}

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

type CreateChatGptAppMcpServerOptions = {
  requestOrigin?: string;
};

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
      return "CodStats opened.";
    case CHATGPT_APP_VIEWS.sessionCurrent:
      return payload.data.active === false
        ? "No active session."
        : "Current session loaded.";
    case CHATGPT_APP_VIEWS.sessionLast:
      return payload.data.found === false
        ? "No completed session found."
        : "Last session loaded.";
    case CHATGPT_APP_VIEWS.matchesHistory:
      return "Match history loaded.";
    case CHATGPT_APP_VIEWS.matchesDetail:
      return "Match details loaded.";
    case CHATGPT_APP_VIEWS.rankLadder:
      return "Rank ladder loaded.";
    case CHATGPT_APP_VIEWS.rankProgress:
      return "Rank progress loaded.";
    case CHATGPT_APP_VIEWS.settings:
      return "Settings loaded.";
    default:
      return "CodStats data loaded.";
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
  requestOrigin: string,
  init?: RequestInit,
): Promise<CallToolResult> {
  const result = await requestContractApi(extra, endpointPath, init);

  if (!result.ok) {
    return result.result;
  }

  const withUi = attachCodstatsUiToPayload(result.payload, requestOrigin);

  return {
    structuredContent: withUi.structuredContent,
    content: buildTextContent(summarizeContractView(withUi.structuredContent)),
    _meta: withUi.meta,
  };
}

function createToolMeta(args: {
  templateName?: CodstatsTemplateName;
  securitySchemes?: readonly unknown[];
}) {
  const templateUri = args.templateName
    ? getCodstatsTemplateResourceUri(args.templateName)
    : null;

  return {
    ...(templateUri
      ? {
          ui: {
            resourceUri: templateUri,
          },
          "openai/outputTemplate": templateUri,
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

export function createChatGptAppMcpServer(
  options: CreateChatGptAppMcpServerOptions = {},
) {
  const server = new McpServer({
    name: "codstats-app",
    version: "2.0.0",
  });

  const requestOrigin = getAppPublicOrigin(options.requestOrigin);
  const templateCatalog = getCodstatsTemplateCatalog(requestOrigin);
  const templateResourceMeta = getCodstatsTemplateResourceMeta(requestOrigin);

  for (const template of templateCatalog) {
    registerAppResource(
      server,
      template.title,
      template.resourceUri,
      {
        description: template.description,
        _meta: templateResourceMeta,
      },
      async () => ({
        contents: [
          {
            uri: template.resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: renderCodstatsTemplateHtml(template.name, requestOrigin),
            _meta: {
              ...templateResourceMeta,
              "openai/widgetDescription": template.description,
            },
          },
        ],
      }),
    );
  }

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
        templateName: "widget",
        securitySchemes: NO_AUTH_SECURITY_SCHEMES,
      }),
    },
    async ({ tab }) => {
      const payload = createChatGptAppSuccessPayload(CHATGPT_APP_VIEWS.uiOpen, {
        tab: tab ?? "overview",
      });
      const withUi = attachCodstatsUiToPayload(payload, requestOrigin);

      return {
        structuredContent: withUi.structuredContent,
        content: buildTextContent("CodStats opened."),
        _meta: withUi.meta,
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
        templateName: "session",
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.currentSession,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(
        extra,
        "/api/app/stats/session/current",
        requestOrigin,
      );
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
        templateName: "session",
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.lastSession,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/stats/session/last", requestOrigin);
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
        templateName: "matches",
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.matchHistory,
      }),
    },
    async ({ cursor, limit }, extra) => {
      return fetchContractToolPayload(
        extra,
        withHistoryQuery({ cursor, limit }),
        requestOrigin,
      );
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
        requestOrigin,
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
      return fetchContractToolPayload(extra, "/api/app/stats/rank/ladder", requestOrigin);
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
        templateName: "rank",
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.rankProgress,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/stats/rank/progress", requestOrigin);
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
        templateName: "settings",
        securitySchemes: CHATGPT_APP_TOOL_SECURITY_SCHEMES.profile,
      }),
    },
    async (_args, extra) => {
      return fetchContractToolPayload(extra, "/api/app/profile", requestOrigin);
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

      return fetchContractToolPayload(extra, "/api/app/disconnect", requestOrigin, {
        method: "POST",
        body: "{}",
      });
    },
  );

  return server;
}
