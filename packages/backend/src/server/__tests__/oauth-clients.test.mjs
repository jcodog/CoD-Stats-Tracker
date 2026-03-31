import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { resetServerEnvForTests } from "../env.ts";

const TEST_ORIGIN = "https://stats-dev.cleoai.cloud";
const ENV_KEYS = [
  "NODE_ENV",
  "OAUTH_AUDIENCE",
  "OAUTH_ISSUER",
  "OAUTH_JWT_SECRET",
  "OAUTH_ALLOWED_REDIRECT_URIS",
  "OAUTH_ALLOWED_SCOPES",
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
  "OAUTH_RESOURCE",
];

const previousEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

let fetchQueryResult = null;

function applyEnv(overrides = {}) {
  process.env.NODE_ENV = "test";
  delete process.env.OAUTH_AUDIENCE;
  process.env.OAUTH_ISSUER = TEST_ORIGIN;
  process.env.OAUTH_JWT_SECRET = "test-secret";
  process.env.OAUTH_ALLOWED_REDIRECT_URIS =
    "https://chatgpt.com/connector_platform_oauth_redirect,https://platform.openai.com/apps-manage/oauth";
  process.env.OAUTH_ALLOWED_SCOPES = "profile.read,stats.read";
  process.env.OAUTH_RESOURCE = TEST_ORIGIN;
  delete process.env.OAUTH_CLIENT_ID;
  delete process.env.OAUTH_CLIENT_SECRET;

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

async function importClientsModule() {
  return import("../oauth/clients.ts");
}

beforeEach(() => {
  fetchQueryResult = null;
  applyEnv();

  mock.module("convex/nextjs", () => ({
    fetchQuery: async () => fetchQueryResult,
  }));
});

afterEach(() => {
  restoreEnv();
  mock.restore();
});

describe("oauth client resolution", () => {
  it("resolves the configured static client before checking Convex storage", async () => {
    applyEnv({
      OAUTH_CLIENT_ID: "static-client",
      OAUTH_CLIENT_SECRET: "static-secret",
    });

    const { resolveOAuthClient } = await importClientsModule();
    const client = await resolveOAuthClient("static-client", TEST_ORIGIN);

    expect(client).toEqual({
      type: "static",
      clientId: "static-client",
      tokenEndpointAuthMethod: "client_secret_post",
      redirectUris: [
        "https://chatgpt.com/connector_platform_oauth_redirect",
        "https://platform.openai.com/apps-manage/oauth",
      ],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
      staticClientSecret: "static-secret",
    });
  });

  it("returns dynamic clients from Convex storage when no static client matches", async () => {
    fetchQueryResult = {
      clientId: "dynamic-client",
      tokenEndpointAuthMethod: "client_secret_basic",
      redirectUris: ["https://client.example.com/oauth/callback"],
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      scope: "profile.read stats.read",
      clientSecretHash: "hashed-secret",
    };

    const { resolveOAuthClient } = await importClientsModule();
    const client = await resolveOAuthClient("dynamic-client", TEST_ORIGIN);

    expect(client).toEqual({
      type: "dynamic",
      clientId: "dynamic-client",
      tokenEndpointAuthMethod: "client_secret_basic",
      redirectUris: ["https://client.example.com/oauth/callback"],
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      scope: "profile.read stats.read",
      clientSecretHash: "hashed-secret",
    });
  });

  it("returns null when no static or dynamic client exists", async () => {
    const { resolveOAuthClient } = await importClientsModule();

    await expect(resolveOAuthClient("missing-client", TEST_ORIGIN)).resolves.toBeNull();
  });

  it("validates static, public, and hashed dynamic client authentication", async () => {
    const { validateOAuthClientAuthentication } = await importClientsModule();

    expect(
      validateOAuthClientAuthentication(
        {
          type: "static",
          clientId: "static-client",
          tokenEndpointAuthMethod: "client_secret_post",
          redirectUris: [],
          grantTypes: [],
          responseTypes: [],
          staticClientSecret: "static-secret",
        },
        {
          clientId: "static-client",
          clientSecret: "static-secret",
          method: "client_secret_post",
        },
      ),
    ).toBe(true);

    expect(
      validateOAuthClientAuthentication(
        {
          type: "static",
          clientId: "static-client",
          tokenEndpointAuthMethod: "client_secret_post",
          redirectUris: [],
          grantTypes: [],
          responseTypes: [],
        },
        {
          clientId: "static-client",
          clientSecret: "static-secret",
          method: "client_secret_post",
        },
      ),
    ).toBe(false);

    expect(
      validateOAuthClientAuthentication(
        {
          type: "dynamic",
          clientId: "public-client",
          tokenEndpointAuthMethod: "none",
          redirectUris: [],
          grantTypes: [],
          responseTypes: [],
        },
        {
          clientId: "public-client",
          clientSecret: null,
          method: "none",
        },
      ),
    ).toBe(true);

    expect(
      validateOAuthClientAuthentication(
        {
          type: "dynamic",
          clientId: "dynamic-client",
          tokenEndpointAuthMethod: "client_secret_basic",
          redirectUris: [],
          grantTypes: [],
          responseTypes: [],
          clientSecretHash:
            "j0f0xJ0WQ5n4K6A9JlQ9vYhP1Fi8US5rjV7Jb7t9x8Q",
        },
        {
          clientId: "dynamic-client",
          clientSecret: "wrong-secret",
          method: "client_secret_basic",
        },
      ),
    ).toBe(false);

    expect(
      validateOAuthClientAuthentication(
        {
          type: "dynamic",
          clientId: "dynamic-client",
          tokenEndpointAuthMethod: "client_secret_post",
          redirectUris: [],
          grantTypes: [],
          responseTypes: [],
          clientSecretHash:
            "m8hM7Q4xg4OL7x8g_x6h8JsX6m6P0aD0sX4nEwI7pC8",
        },
        {
          clientId: "dynamic-client",
          clientSecret: "correct-secret",
          method: "client_secret_post",
        },
      ),
    ).toBe(false);
  });
});
