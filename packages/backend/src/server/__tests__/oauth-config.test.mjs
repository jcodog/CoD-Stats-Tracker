import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import { resetServerEnvForTests } from "../env.ts";
import {
  buildOAuthAbsoluteUrlFromIssuer,
  getOAuthProtectedResourceMetadataUrl,
  getOAuthServerConfig,
  getOAuthSupportedScopes,
  normalizeRedirectUri,
  normalizeResourceIdentifier,
  resetOAuthConfigWarningsForTests,
} from "../oauth/config.ts";

const TEST_ORIGIN = "https://app.example.com";
const TEST_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";

const ENV_KEYS = [
  "NODE_ENV",
  "OAUTH_AUDIENCE",
  "OAUTH_ALLOWED_REDIRECT_URIS",
  "OAUTH_ALLOWED_SCOPES",
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
  "OAUTH_ISSUER",
  "OAUTH_JWT_SECRET",
  "OAUTH_RESOURCE",
];

const previousEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

const originalWarn = console.warn;

function applyEnv(overrides = {}) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }

  Object.assign(process.env, {
    NODE_ENV: "test",
    OAUTH_ALLOWED_REDIRECT_URIS:
      "https://chatgpt.com/connector_platform_oauth_redirect,https://platform.openai.com/apps-manage/oauth",
    OAUTH_ALLOWED_SCOPES: "profile.read,stats.read",
    OAUTH_ISSUER: TEST_ORIGIN,
    OAUTH_JWT_SECRET: "oauth_jwt_secret",
  });

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
  console.warn = originalWarn;
}

beforeEach(() => {
  applyEnv();
  resetOAuthConfigWarningsForTests();
});

afterAll(() => {
  restoreEnv();
});

describe("oauth config helpers", () => {
  it("normalizes resource identifiers, redirect uris, and issuer-based absolute urls", () => {
    expect(normalizeResourceIdentifier("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
    expect(normalizeResourceIdentifier("https://api.example.com/mcp")).toBe(
      "https://api.example.com/mcp",
    );
    expect(normalizeRedirectUri(TEST_REDIRECT_URI)).toBe(TEST_REDIRECT_URI);
    expect(buildOAuthAbsoluteUrlFromIssuer(TEST_ORIGIN, "/oauth/token")).toBe(
      `${TEST_ORIGIN}/oauth/token`,
    );
    expect(() => normalizeRedirectUri("not-a-url")).toThrow(/Invalid URL in redirect_uri/);
  });

  it("builds server config with enforced scopes, refresh scope, and redirect uri allowlists", () => {
    applyEnv({
      OAUTH_CLIENT_ID: "static_client",
      OAUTH_CLIENT_SECRET: "static_secret",
      OAUTH_RESOURCE: "https://api.example.com/mcp",
      OAUTH_AUDIENCE: "https://api.example.com/mcp",
    });

    const config = getOAuthServerConfig(TEST_ORIGIN);

    expect(config).toMatchObject({
      staticClientId: "static_client",
      staticClientSecret: "static_secret",
      jwtSecret: "oauth_jwt_secret",
      audience: "https://api.example.com/mcp",
      issuer: TEST_ORIGIN,
      resource: "https://api.example.com/mcp",
    });
    expect(Array.from(config.allowedRedirectUris)).toEqual([
      TEST_REDIRECT_URI,
      "https://platform.openai.com/apps-manage/oauth",
    ]);
    expect(Array.from(config.allowedScopes ?? [])).toEqual([
      "profile.read",
      "stats.read",
      "offline_access",
    ]);
    expect(getOAuthSupportedScopes(config.allowedScopes)).toEqual([
      "profile.read",
      "stats.read",
      "offline_access",
    ]);
  });

  it("falls back to the request origin outside production when OAUTH_ISSUER is missing", () => {
    const warnings = [];
    console.warn = (message) => warnings.push(String(message));
    applyEnv({
      OAUTH_ISSUER: undefined,
      OAUTH_RESOURCE: undefined,
    });

    const config = getOAuthServerConfig(TEST_ORIGIN);

    expect(config.issuer).toBe(TEST_ORIGIN);
    expect(config.resource).toBe(TEST_ORIGIN);
    expect(config.audience).toBe(TEST_ORIGIN);
    expect(getOAuthProtectedResourceMetadataUrl(TEST_ORIGIN)).toBe(
      `${TEST_ORIGIN}/.well-known/oauth-protected-resource`,
    );
    expect(warnings[0]).toContain("Falling back to request origin");
  });

  it("warns for non-production issuer origin mismatches and throws in production", () => {
    const warnings = [];
    console.warn = (message) => warnings.push(String(message));
    applyEnv({
      OAUTH_ISSUER: "https://other.example.com",
    });

    let config = getOAuthServerConfig(TEST_ORIGIN);

    expect(config.issuer).toBe("https://other.example.com");
    expect(warnings[0]).toContain("does not match configured OAUTH_ISSUER origin");

    applyEnv({
      NODE_ENV: "production",
      OAUTH_ISSUER: "https://other.example.com",
    });

    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /does not match configured OAUTH_ISSUER origin/,
    );

    applyEnv({
      NODE_ENV: "production",
      OAUTH_ISSUER: undefined,
    });

    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /Missing required env var: OAUTH_ISSUER/,
    );
  });

  it("rejects invalid issuers, redirect lists, scopes, client pairs, audiences, and missing secrets", () => {
    applyEnv({
      OAUTH_ISSUER: "ftp://app.example.com",
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /Unsupported protocol in OAUTH_ISSUER/,
    );

    applyEnv({
      OAUTH_ISSUER: "https://app.example.com/oauth",
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /must be an origin URL without path, query, or fragment/,
    );

    applyEnv({
      OAUTH_ALLOWED_REDIRECT_URIS: ", ,",
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /must include at least one URI/,
    );

    applyEnv({
      OAUTH_ALLOWED_REDIRECT_URIS: "not-a-url",
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /Invalid URL in OAUTH_ALLOWED_REDIRECT_URIS/,
    );

    applyEnv({
      OAUTH_ALLOWED_SCOPES: "profile.read",
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /required scope: stats.read/,
    );

    applyEnv({
      OAUTH_ALLOWED_SCOPES: "   ",
    });
    expect(getOAuthServerConfig(TEST_ORIGIN).allowedScopes).toBeNull();

    applyEnv({
      OAUTH_ALLOWED_SCOPES: ", ,",
    });
    expect(getOAuthServerConfig(TEST_ORIGIN).allowedScopes).toBeNull();

    applyEnv({
      OAUTH_RESOURCE: "https://api.example.com",
      OAUTH_AUDIENCE: "https://other.example.com",
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /OAUTH_AUDIENCE must match OAUTH_RESOURCE/,
    );

    applyEnv({
      OAUTH_CLIENT_ID: "static_client",
      OAUTH_CLIENT_SECRET: undefined,
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(/set together/);

    applyEnv({
      OAUTH_JWT_SECRET: undefined,
    });
    expect(() => getOAuthServerConfig(TEST_ORIGIN)).toThrow(
      /Missing required env var: OAUTH_JWT_SECRET/,
    );
  });
});
