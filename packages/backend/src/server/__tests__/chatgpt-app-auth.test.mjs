import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { resetServerEnvForTests } from "../env.ts";
import { signOAuthAccessToken } from "../oauth/jwt.ts";

const TEST_ORIGIN = "https://stats-dev.cleoai.cloud";
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

let fetchQueryImpl = async () => null;
let fetchMutationImpl = async () => ({ ok: true });

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
      scope: "profile.read stats.read",
      jti: "jti_123",
      ...overrides,
    },
    process.env.OAUTH_JWT_SECRET,
  );
}

async function importAuthModule() {
  mock.module("convex/nextjs", () => ({
    fetchQuery: (...args) => fetchQueryImpl(...args),
    fetchMutation: (...args) => fetchMutationImpl(...args),
  }));

  return import("../chatgpt-app-auth.ts");
}

beforeEach(() => {
  applyEnv();
});

afterEach(() => {
  fetchQueryImpl = async () => null;
  fetchMutationImpl = async () => ({ ok: true });
  mock.restore();
});

afterAll(() => {
  restoreEnv();
});

describe("chatgpt app auth", () => {
  it("rejects missing and invalid bearer tokens", async () => {
    const { requireAuthenticatedAppRequest } = await importAuthModule();

    let result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`),
      ["profile.read", "stats.read"],
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("www-authenticate")).toContain("Bearer");
    expect((await result.response.json()).error.message).toBe("Missing bearer token");

    result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      }),
      ["profile.read"],
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect(result.response.status).toBe(401);
    expect((await result.response.json()).error.message).toBe(
      "Invalid or expired access token",
    );
  });

  it("rejects insufficient scopes and inactive user states", async () => {
    const { requireAuthenticatedAppRequest } = await importAuthModule();

    let result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: `Bearer ${createToken({ scope: "profile.read" })}`,
        },
      }),
      ["profile.read", "stats.read", "profile.read"],
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect(result.response.status).toBe(403);
    expect((await result.response.json()).error.message).toContain("Missing required scope");

    fetchQueryImpl = async () => null;
    result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
      }),
      ["profile.read"],
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect((await result.response.json()).error.message).toContain(
      "does not map to an active account",
    );

    fetchQueryImpl = async () => ({
      _id: "user_1",
      clerkUserId: "clerk_user_123",
      discordId: "   ",
      name: "Casey",
      plan: "free",
      status: "active",
      chatgptLinked: true,
      connectionStatus: "active",
      connectionScopes: ["profile.read"],
    });
    result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
      }),
      ["profile.read"],
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect((await result.response.json()).error.message).toContain(
      "missing a CodStats account identity",
    );

    fetchQueryImpl = async () => ({
      _id: "user_1",
      clerkUserId: "clerk_user_123",
      discordId: "discord_1",
      name: "Casey",
      plan: "free",
      status: "disabled",
      chatgptLinked: true,
      connectionStatus: "active",
      connectionScopes: ["profile.read"],
    });
    result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
      }),
      ["profile.read"],
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect((await result.response.json()).error.message).toContain("User account is not active");

    fetchQueryImpl = async () => ({
      _id: "user_1",
      clerkUserId: "clerk_user_123",
      discordId: "discord_1",
      name: "Casey",
      plan: "free",
      status: "active",
      chatgptLinked: false,
      connectionStatus: "revoked",
      connectionScopes: ["profile.read"],
    });
    result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
      }),
      ["profile.read"],
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect(result.response.status).toBe(403);
    expect((await result.response.json()).error.message).toContain(
      "ChatGPT app is not linked",
    );
  });

  it("returns authenticated user context and records last-used timestamps", async () => {
    const {
      requireAuthenticatedAppRequest,
      touchChatGptConnectionLastUsedAt,
    } = await importAuthModule();

    fetchQueryImpl = async () => ({
      _id: "user_1",
      clerkUserId: "clerk_user_123",
      discordId: "discord_1",
      name: "Casey",
      plan: "premium",
      status: "active",
      chatgptLinked: true,
      connectionStatus: "active",
      connectionScopes: ["profile.read", "stats.read"],
    });

    const result = await requireAuthenticatedAppRequest(
      new Request(`${TEST_ORIGIN}/api/app/profile`, {
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
      }),
      ["profile.read", "stats.read"],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected auth success");
    }
    expect(result.auth.token.sub).toBe("clerk_user_123");
    expect(result.auth.token.scopes).toEqual(["profile.read", "stats.read"]);
    expect(result.auth.user.plan).toBe("premium");

    fetchMutationImpl = async () => ({ ok: false });
    await expect(touchChatGptConnectionLastUsedAt("user_1")).rejects.toThrow(
      "chatgpt_connection_not_active",
    );

    fetchMutationImpl = async () => ({ ok: true, touchedAt: 123 });
    await expect(touchChatGptConnectionLastUsedAt("user_1")).resolves.toEqual({
      ok: true,
      touchedAt: 123,
    });
  });
});
