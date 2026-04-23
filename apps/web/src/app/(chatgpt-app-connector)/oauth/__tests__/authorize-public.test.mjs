import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test";
import { handleAuthorizeGet } from "../authorize/route.ts";

import { resetServerEnvForTests } from "@workspace/backend/server/env";

const TEST_ORIGIN = "https://app.example.com";
const TEST_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";

const OAUTH_ENV_KEYS = [
  "NODE_ENV",
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
  "OAUTH_JWT_SECRET",
  "OAUTH_AUDIENCE",
  "OAUTH_RESOURCE",
  "OAUTH_ISSUER",
  "OAUTH_ALLOWED_REDIRECT_URIS",
  "OAUTH_ALLOWED_SCOPES",
];

const previousEnv = Object.fromEntries(
  OAUTH_ENV_KEYS.map((key) => [key, process.env[key]]),
);

const DEFAULT_CLIENT = {
  clientId: "chatgpt_static_client",
  tokenEndpointAuthMethod: "client_secret_post",
  redirectUris: [TEST_REDIRECT_URI],
  grantTypes: ["authorization_code", "refresh_token"],
  responseTypes: ["code"],
  type: "static",
  staticClientSecret: "chatgpt_static_secret",
};

let resolveOAuthClientImpl = async () => DEFAULT_CLIENT;

function configureOAuthEnv(overrides = {}) {
  process.env.NODE_ENV = "test";
  process.env.OAUTH_CLIENT_ID = "chatgpt_static_client";
  process.env.OAUTH_CLIENT_SECRET = "chatgpt_static_secret";
  process.env.OAUTH_JWT_SECRET = "chatgpt_test_jwt_secret";
  delete process.env.OAUTH_AUDIENCE;
  process.env.OAUTH_RESOURCE = TEST_ORIGIN;
  process.env.OAUTH_ISSUER = TEST_ORIGIN;
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

function restoreOAuthEnv() {
  for (const key of OAUTH_ENV_KEYS) {
    const previousValue = previousEnv[key];
    if (previousValue === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = previousValue;
  }

  resetServerEnvForTests();
}

function createAuthorizeRequest(overrides = {}, duplicateParams = []) {
  const url = new URL("/oauth/authorize", TEST_ORIGIN);
  const defaults = {
    response_type: "code",
    client_id: "chatgpt_static_client",
    redirect_uri: TEST_REDIRECT_URI,
    scope: "stats.read",
    state: "state_value_with_16_chars",
    resource: TEST_ORIGIN,
    code_challenge: "a".repeat(43),
    code_challenge_method: "S256",
  };

  for (const [key, value] of Object.entries({
    ...defaults,
    ...overrides,
  })) {
    if (value === undefined || value === null) {
      continue;
    }

    url.searchParams.set(key, value);
  }

  for (const [key, value] of duplicateParams) {
    url.searchParams.append(key, value);
  }

  return new Request(url.toString());
}

function expectRedirectError(
  response,
  expectedError,
  descriptionPart,
  expectedState = "state_value_with_16_chars",
) {
  expect(response.status).toBeGreaterThanOrEqual(300);
  expect(response.status).toBeLessThan(400);

  const location = response.headers.get("location");
  expect(location).not.toBeNull();

  if (!location) {
    throw new Error("Expected redirect location");
  }

  const redirectUrl = new URL(location);
  expect(redirectUrl.origin + redirectUrl.pathname).toBe(TEST_REDIRECT_URI);
  expect(redirectUrl.searchParams.get("error")).toBe(expectedError);
  expect(redirectUrl.searchParams.get("error_description")).toContain(descriptionPart);
  expect(redirectUrl.searchParams.get("state")).toBe(expectedState);
}

beforeEach(() => {
  configureOAuthEnv();
});

afterEach(() => {
  resolveOAuthClientImpl = async () => DEFAULT_CLIENT;
});

afterAll(() => {
  restoreOAuthEnv();
});

describe("/oauth/authorize public behavior", () => {
  it("returns JSON errors for config, duplicate params, and malformed redirect inputs", async () => {
    configureOAuthEnv({
      OAUTH_ALLOWED_SCOPES: "profile.read",
    });

    let response = await handleAuthorizeGet(createAuthorizeRequest());
    let payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("invalid_request");
    expect(payload.error_description).toBe("OAuth server is not configured");

    configureOAuthEnv();

    response = await handleAuthorizeGet(
      createAuthorizeRequest({}, [["client_id", "duplicate-client"]]),
    );
    payload = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(payload.error).toBe("invalid_request");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        redirect_uri: "not-a-url",
      }),
    );
    payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_request");
    expect(payload.error_description).toContain("Invalid redirect_uri");
  });

  it("rejects malformed authorize inputs before persistence", async () => {
    let response = await handleAuthorizeGet(
      createAuthorizeRequest({
        redirect_uri: "https://malicious.example.com/callback",
      }),
    );
    let payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error_description).toContain("redirect_uri is not allowlisted");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        response_type: "token",
      }),
    );
    payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_request");
    expect(payload.error_description).toContain("response_type must be 'code'");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        client_id: "",
      }),
    );
    expectRedirectError(response, "invalid_request", "client_id is required");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        resource: "not-a-url",
      }),
    );
    expectRedirectError(
      response,
      "invalid_request",
      "resource is required and must match configured resource server",
    );

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        resource: "https://different.example.com",
      }),
    );
    expectRedirectError(
      response,
      "invalid_request",
      "resource is required and must match configured resource server",
    );

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        state: "short-state",
      }),
    );
    expectRedirectError(
      response,
      "invalid_request",
      "state is required and must be 16-512 chars",
      "short-state",
    );

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        scope: undefined,
      }),
    );
    expectRedirectError(response, "invalid_scope", "scope is required");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        scope: "admin.write",
      }),
    );
    expectRedirectError(response, "invalid_scope", "Requested scope is invalid");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        code_challenge: undefined,
      }),
    );
    expectRedirectError(response, "invalid_request", "PKCE is required");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        code_challenge_method: "plain",
      }),
    );
    expectRedirectError(response, "invalid_request", "Only S256 PKCE is supported");

    response = await handleAuthorizeGet(
      createAuthorizeRequest({
        code_challenge: "bad format",
      }),
    );
    expectRedirectError(response, "invalid_request", "Invalid code_challenge format");
  });

  it("rejects unsupported or unknown clients without touching persistence", async () => {
    let mutationCalled = false;

    resolveOAuthClientImpl = async () => null;
    let response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => "convex_token",
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => {
        mutationCalled = true;
        return { ok: true };
      },
    });
    expectRedirectError(response, "invalid_client", "Unknown client_id");
    expect(mutationCalled).toBe(false);

    resolveOAuthClientImpl = async () => ({
      ...DEFAULT_CLIENT,
      responseTypes: ["token"],
    });
    response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => "convex_token",
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => ({ ok: true }),
    });
    expectRedirectError(response, "invalid_client", "does not support code response_type");

    resolveOAuthClientImpl = async () => ({
      ...DEFAULT_CLIENT,
      grantTypes: ["refresh_token"],
    });
    response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => "convex_token",
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => ({ ok: true }),
    });
    expectRedirectError(
      response,
      "invalid_client",
      "does not support authorization_code grant",
    );

    resolveOAuthClientImpl = async () => ({
      ...DEFAULT_CLIENT,
      redirectUris: ["https://other.example.com/callback"],
    });
    response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => "convex_token",
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => ({ ok: true }),
    });
    expectRedirectError(response, "invalid_request", "redirect_uri is not registered for client");
  });

  it("does not redirect to Clerk sign-in when session is missing and handles token/persistence failures", async () => {
    let mutationCalled = false;
    let response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: null,
        sessionId: null,
        getToken: async () => null,
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => {
        mutationCalled = true;
        return { ok: true };
      },
    });

    expectRedirectError(response, "invalid_request", "signed in");
    expect(mutationCalled).toBe(false);

    response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => null,
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => ({ ok: true }),
    });
    expectRedirectError(response, "invalid_request", "Unable to initialize authorization flow");

    response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => "convex_token",
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async () => {
        throw new Error("mutation exploded");
      },
    });
    expectRedirectError(response, "invalid_request", "Unable to create authorization code");
  });

  it("persists authorization codes and redirects back to the oauth client on success", async () => {
    const persistedCalls = [];

    const response = await handleAuthorizeGet(createAuthorizeRequest(), {
      getAuth: async () => ({
        userId: "user_123",
        sessionId: "session_123",
        getToken: async () => "convex_token",
      }),
      resolveClient: async (...args) => resolveOAuthClientImpl(...args),
      runMutation: async (...args) => {
        persistedCalls.push(args);
        return { ok: true };
      },
    });

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(persistedCalls).toHaveLength(1);

    const [mutationRef, payload, options] = persistedCalls[0];
    expect(mutationRef).toBeDefined();
    expect(payload.clientId).toBe("chatgpt_static_client");
    expect(payload.resource).toBe(TEST_ORIGIN);
    expect(payload.redirectUri).toBe(TEST_REDIRECT_URI);
    expect(payload.sessionId).toBe("session_123");
    expect(payload.scopes).toEqual(["stats.read"]);
    expect(payload.codeChallenge).toBe("a".repeat(43));
    expect(payload.codeChallengeMethod).toBe("S256");
    expect(typeof payload.codeHash).toBe("string");
    expect(payload.codeHash.length).toBeGreaterThan(10);
    expect(typeof payload.stateHash).toBe("string");
    expect(payload.stateHash.length).toBeGreaterThan(10);
    expect(typeof payload.expiresAt).toBe("number");
    expect(options).toEqual({
      token: "convex_token",
    });

    const location = response.headers.get("location");
    expect(location).not.toBeNull();

    if (!location) {
      throw new Error("Expected successful authorize redirect");
    }

    const redirectUrl = new URL(location);
    const code = redirectUrl.searchParams.get("code");

    expect(redirectUrl.origin + redirectUrl.pathname).toBe(TEST_REDIRECT_URI);
    expect(code).not.toBeNull();
    expect(code?.length).toBeGreaterThan(20);
    expect(redirectUrl.searchParams.get("state")).toBe("state_value_with_16_chars");
  });
});
