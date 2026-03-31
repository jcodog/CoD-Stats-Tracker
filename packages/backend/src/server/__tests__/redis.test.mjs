import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import { resetServerEnvForTests } from "../env.ts";
import { getRedisClient, getRedisConnectionState } from "../redis.ts";

const ENV_KEYS = ["KV_URL", "REDIS_TLS_URL", "REDIS_URL"];
const previousEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function applyEnv(overrides = {}) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }

  Object.assign(process.env, overrides);
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

describe("redis env resolution", () => {
  it("reports when no Redis-compatible env vars are configured", async () => {
    expect(getRedisConnectionState()).toEqual({
      configured: false,
      urlSource: null,
      isOpen: false,
      isReady: false,
    });

    await expect(getRedisClient()).resolves.toBeNull();
  });

  it("prefers REDIS_URL, then REDIS_TLS_URL, then KV_URL", () => {
    applyEnv({
      KV_URL: "rediss://kv.example.com",
      REDIS_TLS_URL: "rediss://tls.example.com",
      REDIS_URL: "redis://plain.example.com",
    });
    expect(getRedisConnectionState().urlSource).toBe("REDIS_URL");

    applyEnv({
      KV_URL: "rediss://kv.example.com",
      REDIS_TLS_URL: "rediss://tls.example.com",
    });
    expect(getRedisConnectionState().urlSource).toBe("REDIS_TLS_URL");

    applyEnv({
      KV_URL: "rediss://kv.example.com",
    });
    expect(getRedisConnectionState().urlSource).toBe("KV_URL");
  });
});

