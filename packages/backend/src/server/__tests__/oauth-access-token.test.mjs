import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import {
  buildOAuthWwwAuthenticate,
  extractBearerToken,
  verifyOAuthAccessToken,
} from "../oauth/access-token.ts";
import { resetServerEnvForTests } from "../env.ts";
import { signOAuthAccessToken } from "../oauth/jwt.ts";

const TEST_ORIGIN = "https://stats.example.com";
const ENV_KEYS = [
  "NODE_ENV",
  "OAUTH_ALLOWED_REDIRECT_URIS",
  "OAUTH_ALLOWED_SCOPES",
  "OAUTH_AUDIENCE",
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
    OAUTH_ALLOWED_REDIRECT_URIS:
      "https://chatgpt.com/connector_platform_oauth_redirect",
    OAUTH_ALLOWED_SCOPES: "profile.read,stats.read",
    OAUTH_AUDIENCE: TEST_ORIGIN,
    OAUTH_ISSUER: TEST_ORIGIN,
    OAUTH_JWT_SECRET: "oauth_jwt_secret",
    OAUTH_RESOURCE: TEST_ORIGIN,
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

function createToken(overrides = {}) {
  return signOAuthAccessToken(
    {
      iss: TEST_ORIGIN,
      aud: TEST_ORIGIN,
      sub: "clerk_user_123",
      iat: 1,
      exp: 9_999_999_999,
      scope: "profile.read stats.read profile.read",
      jti: "jti_123",
      ...overrides,
    },
    process.env.OAUTH_JWT_SECRET,
  );
}

beforeEach(() => {
  applyEnv();
});

afterAll(() => {
  restoreEnv();
});

describe("oauth access token helpers", () => {
  it("extracts bearer tokens case-insensitively and ignores invalid schemes", () => {
    expect(
      extractBearerToken(
        new Request("https://example.com", {
          headers: {
            Authorization: "Bearer token_123",
          },
        }),
      ),
    ).toBe("token_123");

    expect(
      extractBearerToken(
        new Request("https://example.com", {
          headers: {
            Authorization: "bearer token_456",
          },
        }),
      ),
    ).toBe("token_456");

    expect(
      extractBearerToken(
        new Request("https://example.com", {
          headers: {
            Authorization: "Basic token_789",
          },
        }),
      ),
    ).toBeNull();

    expect(
      extractBearerToken(
        new Request("https://example.com", {
          headers: {
            Authorization: "Bearer",
          },
        }),
      ),
    ).toBeNull();
  });

  it("verifies valid access tokens and expands scopes", () => {
    const token = createToken();

    expect(verifyOAuthAccessToken(token, TEST_ORIGIN)).toEqual({
      iss: TEST_ORIGIN,
      aud: TEST_ORIGIN,
      sub: "clerk_user_123",
      iat: 1,
      exp: 9_999_999_999,
      scope: "profile.read stats.read profile.read",
      jti: "jti_123",
      scopes: ["profile.read", "stats.read", "profile.read"],
    });
  });

  it("supports explicit expected audience overrides", () => {
    const token = createToken({
      aud: "https://resource.example.com",
    });

    expect(
      verifyOAuthAccessToken(token, TEST_ORIGIN, {
        expectedAudiences: ["https://resource.example.com"],
      }),
    ).toMatchObject({
      aud: "https://resource.example.com",
      scopes: ["profile.read", "stats.read", "profile.read"],
    });
  });

  it("builds OAuth challenges with resource metadata and error details", () => {
    const challenge = buildOAuthWwwAuthenticate(TEST_ORIGIN, {
      error: "insufficient_scope",
      errorDescription: "Missing required scope",
      scope: "stats.read",
    });

    expect(challenge).toContain("Bearer ");
    expect(challenge).toContain(
      'resource_metadata="https://stats.example.com/.well-known/oauth-protected-resource"',
    );
    expect(challenge).toContain('scope="stats.read"');
    expect(challenge).toContain('error="insufficient_scope"');
    expect(challenge).toContain('error_description="Missing required scope"');
  });
});
