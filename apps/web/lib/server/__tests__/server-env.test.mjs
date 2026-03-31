import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import { getServerEnv, resetServerEnvForTests } from "@workspace/backend/server/env";
import { validateLandingMetricsApiKey } from "@workspace/backend/server/landing-metrics-auth";
import { getOAuthServerConfig } from "@workspace/backend/server/oauth/config";

const TEST_ORIGIN = "https://app.example.com";
const TEST_REDIRECT_URI =
  "https://chatgpt.com/connector_platform_oauth_redirect";

const ENV_KEYS = [
  "LANDING_METRICS_API_KEY",
  "LANDING_METRICS_REQUIRE_API_KEY",
  "NODE_ENV",
  "OAUTH_ALLOWED_REDIRECT_URIS",
  "OAUTH_ALLOWED_SCOPES",
  "OAUTH_AUDIENCE",
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
  "OAUTH_ISSUER",
  "OAUTH_JWT_SECRET",
  "OAUTH_RESOURCE",
];

const previousEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function applyEnv(overrides = {}) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }

  Object.assign(process.env, {
    NODE_ENV: "test",
    OAUTH_ALLOWED_REDIRECT_URIS: TEST_REDIRECT_URI,
    OAUTH_ALLOWED_SCOPES: "profile.read,stats.read",
    OAUTH_ISSUER: TEST_ORIGIN,
    OAUTH_JWT_SECRET: "chatgpt_test_secret",
    ...overrides,
  });

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
});

afterAll(() => {
  restoreEnv();
});

describe("server env", () => {
  it("caches parsed env values until the test reset hook runs", () => {
    process.env.OAUTH_ISSUER = TEST_ORIGIN;
    resetServerEnvForTests();

    expect(getServerEnv().OAUTH_ISSUER).toBe(TEST_ORIGIN);

    process.env.OAUTH_ISSUER = "https://changed.example.com";

    expect(getServerEnv().OAUTH_ISSUER).toBe(TEST_ORIGIN);

    resetServerEnvForTests();

    expect(getServerEnv().OAUTH_ISSUER).toBe("https://changed.example.com");
  });

  it("treats empty strings as undefined", () => {
    applyEnv({
      LANDING_METRICS_API_KEY: "",
    });

    expect(getServerEnv().LANDING_METRICS_API_KEY).toBeUndefined();
  });

  it("requires static OAuth client credentials to be configured together", () => {
    applyEnv({
      OAUTH_CLIENT_ID: "chatgpt_static_client",
    });

    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must be set together/,
    );
  });

  it("requires OAUTH_AUDIENCE to match OAUTH_RESOURCE when both are set", () => {
    applyEnv({
      OAUTH_AUDIENCE: "https://audience.example.com",
      OAUTH_RESOURCE: TEST_ORIGIN,
    });

    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /OAUTH_AUDIENCE must match OAUTH_RESOURCE/,
    );
  });

  it("reports a missing landing metrics key when the requirement flag is enabled", () => {
    applyEnv({
      LANDING_METRICS_REQUIRE_API_KEY: "true",
    });

    expect(
      validateLandingMetricsApiKey(new Request("https://example.com/api/app")),
    ).toEqual({
      valid: false,
      configured: false,
      reason: "missing_api_key_env",
    });
  });
});
