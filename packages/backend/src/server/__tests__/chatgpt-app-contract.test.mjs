import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { z } from "zod";

import {
  CHATGPT_APP_ERROR_CODES,
  CHATGPT_APP_JSON_CONTENT_TYPE,
  CHATGPT_APP_VIEWS,
  ChatGptAppRouteError,
  createChatGptAppErrorPayload,
  createChatGptAppErrorResponse,
  createChatGptAppJsonResponse,
  createChatGptAppRequestId,
  createChatGptAppSuccessPayload,
  createChatGptAppSuccessResponse,
  getStatusForChatGptAppErrorCode,
  resolveChatGptAppOAuthMetadata,
  withChatGptAppRoute,
} from "../chatgpt-app-contract.ts";
import { resetServerEnvForTests } from "../env.ts";

const TEST_ORIGIN = "https://stats-dev.cleoai.cloud";
const ENV_KEYS = [
  "NODE_ENV",
  "OAUTH_AUDIENCE",
  "OAUTH_ISSUER",
  "OAUTH_RESOURCE",
  "OAUTH_JWT_SECRET",
  "OAUTH_ALLOWED_REDIRECT_URIS",
  "OAUTH_ALLOWED_SCOPES",
];
const previousEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalCrypto = globalThis.crypto;
const originalConsoleError = console.error;

function applyEnv(overrides = {}) {
  process.env.NODE_ENV = "test";
  delete process.env.OAUTH_AUDIENCE;
  process.env.OAUTH_ISSUER = TEST_ORIGIN;
  delete process.env.OAUTH_RESOURCE;
  process.env.OAUTH_JWT_SECRET = "test-secret";
  process.env.OAUTH_ALLOWED_REDIRECT_URIS =
    "https://chatgpt.com/connector_platform_oauth_redirect,https://platform.openai.com/apps-manage/oauth";
  process.env.OAUTH_ALLOWED_SCOPES = "profile.read,stats.read";

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  resetServerEnvForTests();
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = previousEnv[key];
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  resetServerEnvForTests();
}

beforeEach(() => {
  applyEnv();
  console.error = () => {};
});

afterEach(() => {
  mock.restore();
  Object.defineProperty(globalThis, "crypto", {
    value: originalCrypto,
    configurable: true,
    writable: true,
  });
  console.error = originalConsoleError;
});

afterAll(() => {
  restoreEnv();
});

describe("chatgpt app contract helpers", () => {
  it("creates success and error payloads with optional metadata", async () => {
    expect(
      createChatGptAppSuccessPayload(
        CHATGPT_APP_VIEWS.rankProgress,
        { currentSr: 3100 },
        123,
      ),
    ).toEqual({
      ok: true,
      view: CHATGPT_APP_VIEWS.rankProgress,
      data: { currentSr: 3100 },
      meta: { generatedAt: 123 },
    });

    expect(
      createChatGptAppErrorPayload(
        CHATGPT_APP_ERROR_CODES.unauthorized,
        "Missing bearer token",
        {
          requestId: "req_123",
          details: { reason: "missing" },
          oauth: {
            issuer: TEST_ORIGIN,
            authorization_endpoint: `${TEST_ORIGIN}/oauth/authorize`,
            token_endpoint: `${TEST_ORIGIN}/oauth/token`,
            scopes: ["stats.read"],
          },
          generatedAt: 456,
        },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: CHATGPT_APP_ERROR_CODES.unauthorized,
        message: "Missing bearer token",
        requestId: "req_123",
        details: { reason: "missing" },
      },
      oauth: {
        issuer: TEST_ORIGIN,
        authorization_endpoint: `${TEST_ORIGIN}/oauth/authorize`,
        token_endpoint: `${TEST_ORIGIN}/oauth/token`,
        scopes: ["stats.read"],
      },
      meta: { generatedAt: 456 },
    });
  });

  it("maps contract error codes to the expected HTTP statuses", () => {
    expect(getStatusForChatGptAppErrorCode(CHATGPT_APP_ERROR_CODES.validation)).toBe(400);
    expect(getStatusForChatGptAppErrorCode(CHATGPT_APP_ERROR_CODES.unauthorized)).toBe(401);
    expect(getStatusForChatGptAppErrorCode(CHATGPT_APP_ERROR_CODES.notFound)).toBe(404);
    expect(getStatusForChatGptAppErrorCode(CHATGPT_APP_ERROR_CODES.rateLimit)).toBe(429);
    expect(getStatusForChatGptAppErrorCode(CHATGPT_APP_ERROR_CODES.internal)).toBe(502);
  });

  it("creates request ids with and without crypto.randomUUID", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: () => "uuid_test_123",
      },
      configurable: true,
      writable: true,
    });
    expect(createChatGptAppRequestId()).toBe("uuid_test_123");

    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
      writable: true,
    });
    expect(createChatGptAppRequestId()).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
  });

  it("builds JSON success and error responses with contract headers", async () => {
    const genericResponse = createChatGptAppJsonResponse(
      { ok: true },
      {
        status: 201,
        headers: { "X-Test": "1" },
        requestId: "req_201",
      },
    );
    expect(genericResponse.status).toBe(201);
    expect(genericResponse.headers.get("cache-control")).toBe("no-store");
    expect(genericResponse.headers.get("content-type")).toBe(CHATGPT_APP_JSON_CONTENT_TYPE);
    expect(genericResponse.headers.get("x-test")).toBe("1");
    expect(genericResponse.headers.get("x-request-id")).toBe("req_201");

    const successResponse = createChatGptAppSuccessResponse(
      CHATGPT_APP_VIEWS.settings,
      { connected: true },
      { status: 202 },
    );
    expect(successResponse.status).toBe(202);
    expect((await successResponse.json()).ok).toBe(true);

    const errorResponse = createChatGptAppErrorResponse(
      CHATGPT_APP_ERROR_CODES.notFound,
      "Missing match",
      {
        requestId: "req_404",
      },
    );
    expect(errorResponse.status).toBe(404);
    expect((await errorResponse.json()).error.requestId).toBe("req_404");
  });

  it("resolves oauth metadata and falls back to undefined when oauth config is unavailable", () => {
    expect(
      resolveChatGptAppOAuthMetadata(TEST_ORIGIN, [
        "stats.read",
        "stats.read",
        "",
        "profile.read",
      ]),
    ).toEqual({
      issuer: TEST_ORIGIN,
      authorization_endpoint: `${TEST_ORIGIN}/oauth/authorize`,
      token_endpoint: `${TEST_ORIGIN}/oauth/token`,
      scopes: ["stats.read", "profile.read"],
    });

    process.env.NODE_ENV = "production";
    delete process.env.OAUTH_ISSUER;
    resetServerEnvForTests();
    expect(resolveChatGptAppOAuthMetadata(TEST_ORIGIN, ["stats.read"])).toBeUndefined();
  });

  it("normalizes thrown route errors into contract responses", async () => {
    const routeWithCustomError = withChatGptAppRoute(
      "route.custom",
      async () => {
        throw new ChatGptAppRouteError(CHATGPT_APP_ERROR_CODES.notFound, "Missing data", {
          details: { id: "abc" },
          oauth: {
            issuer: TEST_ORIGIN,
            authorization_endpoint: `${TEST_ORIGIN}/oauth/authorize`,
            token_endpoint: `${TEST_ORIGIN}/oauth/token`,
            scopes: ["stats.read"],
          },
        });
      },
    );

    const customResponse = await routeWithCustomError(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: { "x-request-id": "req_existing" },
      }),
    );
    const customBody = await customResponse.json();

    expect(customResponse.status).toBe(404);
    expect(customResponse.headers.get("content-type")).toContain("application/json");
    expect(customResponse.headers.get("x-request-id")).toBe("req_existing");
    expect(customBody.error.details).toEqual({ id: "abc" });
    expect(customBody.oauth.issuer).toBe(TEST_ORIGIN);

    const routeWithZodError = withChatGptAppRoute("route.zod", async () => {
      z.object({ limit: z.number() }).parse({ limit: "abc" });
      return new Response();
    });
    const zodResponse = await routeWithZodError(
      new Request(`${TEST_ORIGIN}/api/app/stats/matches`),
    );
    expect(zodResponse.status).toBe(400);
    expect((await zodResponse.json()).error.code).toBe(CHATGPT_APP_ERROR_CODES.validation);

    const routeWithSyntaxError = withChatGptAppRoute("route.syntax", async () => {
      throw new SyntaxError("Unexpected token");
    });
    const syntaxResponse = await routeWithSyntaxError(
      new Request(`${TEST_ORIGIN}/api/app/stats/matches`),
    );
    expect(syntaxResponse.status).toBe(400);
    expect((await syntaxResponse.json()).error.message).toBe("Invalid request payload.");

    const routeWithGenericError = withChatGptAppRoute("route.generic", async () => {
      throw new Error("upstream failed");
    });
    const genericResponse = await routeWithGenericError(
      new Request(`${TEST_ORIGIN}/api/app/profile`),
    );
    const genericBody = await genericResponse.json();
    expect(genericResponse.status).toBe(502);
    expect(genericBody.error.code).toBe(CHATGPT_APP_ERROR_CODES.internal);
    expect(genericBody.error.details.cause).toBe("upstream failed");
    expect(typeof genericBody.error.details.requestId).toBe("string");
  });

  it("clones successful route responses with contract headers", async () => {
    const route = withChatGptAppRoute("route.ok", async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        statusText: "Created",
        headers: {
          "Content-Type": "text/plain",
          "X-Test": "ok",
        },
      });
    });

    const response = await route(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: { "x-request-id": "req_201" },
      }),
    );

    expect(response.status).toBe(201);
    expect(response.statusText).toBe("Created");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-request-id")).toBe("req_201");
    expect(response.headers.get("x-test")).toBe("ok");
    expect(await response.json()).toEqual({ ok: true });
  });
});
