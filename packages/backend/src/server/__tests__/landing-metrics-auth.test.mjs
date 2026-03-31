import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import {
  getLandingMetricsApiKeyHeaderName,
  shouldRequireLandingMetricsApiKey,
  validateLandingMetricsApiKey,
} from "../landing-metrics-auth.ts";
import { resetServerEnvForTests } from "../env.ts";

const ENV_KEYS = ["LANDING_METRICS_API_KEY", "LANDING_METRICS_REQUIRE_API_KEY"];
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
  applyEnv({
    LANDING_METRICS_API_KEY: "landing-secret",
  });
});

afterAll(() => {
  restoreEnv();
});

describe("landing metrics auth", () => {
  it("reads the requirement flag from env", () => {
    expect(shouldRequireLandingMetricsApiKey()).toBe(false);

    applyEnv({
      LANDING_METRICS_API_KEY: "landing-secret",
      LANDING_METRICS_REQUIRE_API_KEY: "true",
    });

    expect(shouldRequireLandingMetricsApiKey()).toBe(true);
  });

  it("accepts the direct API key header", () => {
    const request = new Request("https://example.com/api/landing-metrics", {
      headers: {
        [getLandingMetricsApiKeyHeaderName()]: "landing-secret",
      },
    });

    expect(validateLandingMetricsApiKey(request)).toEqual({
      valid: true,
      configured: true,
      reason: "ok",
    });
  });

  it("falls back to bearer authorization when the direct header is absent", () => {
    const request = new Request("https://example.com/api/landing-metrics", {
      headers: {
        Authorization: "Bearer landing-secret",
      },
    });

    expect(validateLandingMetricsApiKey(request)).toEqual({
      valid: true,
      configured: true,
      reason: "ok",
    });
  });

  it("rejects missing headers when an API key is configured", () => {
    const request = new Request("https://example.com/api/landing-metrics");

    expect(validateLandingMetricsApiKey(request)).toEqual({
      valid: false,
      configured: true,
      reason: "missing_api_key_header",
    });
  });

  it("rejects incorrect API keys", () => {
    const request = new Request("https://example.com/api/landing-metrics", {
      headers: {
        Authorization: "Bearer wrong-secret",
      },
    });

    expect(validateLandingMetricsApiKey(request)).toEqual({
      valid: false,
      configured: true,
      reason: "invalid_api_key",
    });
  });

  it("reports missing configuration when no API key env exists", () => {
    applyEnv();

    const request = new Request("https://example.com/api/landing-metrics", {
      headers: {
        [getLandingMetricsApiKeyHeaderName()]: "landing-secret",
      },
    });

    expect(validateLandingMetricsApiKey(request)).toEqual({
      valid: false,
      configured: false,
      reason: "missing_api_key_env",
    });
  });
});

