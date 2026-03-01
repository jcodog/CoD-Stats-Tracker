export const CHATGPT_APP_VIEWS = {
  uiOpen: "ui.open",
  sessionCurrent: "session.current",
  sessionLast: "session.last",
  matchesHistory: "matches.history",
  matchesDetail: "matches.detail",
  rankLadder: "rank.ladder",
  rankProgress: "rank.progress",
  settings: "settings",
} as const;

export type ChatGptAppView =
  (typeof CHATGPT_APP_VIEWS)[keyof typeof CHATGPT_APP_VIEWS];

export const CHATGPT_APP_ERROR_CODES = {
  unauthorized: "UNAUTHORIZED",
  notLinked: "NOT_LINKED",
  notFound: "NOT_FOUND",
  validation: "VALIDATION",
  rateLimit: "RATE_LIMIT",
  internal: "INTERNAL",
} as const;

export type ChatGptAppErrorCode =
  (typeof CHATGPT_APP_ERROR_CODES)[keyof typeof CHATGPT_APP_ERROR_CODES];

export type ChatGptAppSuccessPayload<Data extends Record<string, unknown>> = {
  ok: true;
  view: ChatGptAppView;
  data: Data;
  meta: {
    generatedAt: number;
  };
};

export type ChatGptAppErrorPayload = {
  ok: false;
  error: {
    code: ChatGptAppErrorCode;
    message: string;
    requestId?: string;
  };
  meta: {
    generatedAt: number;
  };
};

export function createChatGptAppSuccessPayload<Data extends Record<string, unknown>>(
  view: ChatGptAppView,
  data: Data,
  generatedAt = Date.now(),
): ChatGptAppSuccessPayload<Data> {
  return {
    ok: true,
    view,
    data,
    meta: {
      generatedAt,
    },
  };
}

export function createChatGptAppErrorPayload(
  code: ChatGptAppErrorCode,
  message: string,
  options?: {
    requestId?: string;
    generatedAt?: number;
  },
): ChatGptAppErrorPayload {
  const error: ChatGptAppErrorPayload["error"] = {
    code,
    message,
  };

  if (options?.requestId) {
    error.requestId = options.requestId;
  }

  return {
    ok: false,
    error,
    meta: {
      generatedAt: options?.generatedAt ?? Date.now(),
    },
  };
}
