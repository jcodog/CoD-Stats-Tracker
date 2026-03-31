import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import { resetServerEnvForTests } from "../env.ts";
import {
  resetWidgetMetaWarningsForTests,
  resolveWidgetUiMeta,
} from "../widget-meta.ts";

const ENV_KEYS = ["NODE_ENV", "OAUTH_ISSUER"];
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
  console.warn = originalWarn;
}

beforeEach(() => {
  applyEnv();
  resetWidgetMetaWarningsForTests();
});

afterAll(() => {
  restoreEnv();
});

describe("widget metadata", () => {
  it("falls back to localhost with empty CSP metadata outside production", () => {
    const warnings = [];
    console.warn = (message) => warnings.push(String(message));

    expect(resolveWidgetUiMeta()).toEqual({
      domain: "localhost",
      csp: {
        resourceDomains: [],
        connectDomains: [],
        frameDomains: [],
        baseUriDomains: [],
      },
    });
    expect(warnings[0]).toContain("OAUTH_ISSUER is not set");
  });

  it("requires OAUTH_ISSUER in production", () => {
    applyEnv({
      NODE_ENV: "production",
    });

    expect(() => resolveWidgetUiMeta()).toThrow(/Missing required env var OAUTH_ISSUER/);
  });

  it("normalizes issuers without a protocol for widget metadata", () => {
    const warnings = [];
    console.warn = (message) => warnings.push(String(message));
    applyEnv({
      OAUTH_ISSUER: "stats.cleoai.cloud",
    });

    expect(resolveWidgetUiMeta()).toEqual({
      domain: "stats.cleoai.cloud",
      csp: {
        resourceDomains: ["https://stats.cleoai.cloud"],
        connectDomains: ["https://stats.cleoai.cloud"],
        frameDomains: [],
        baseUriDomains: [],
      },
    });
    expect(warnings[0]).toContain("missing a protocol");
  });

  it("preserves valid http issuers for local or non-production widget metadata", () => {
    applyEnv({
      OAUTH_ISSUER: "http://localhost:3000",
    });

    expect(resolveWidgetUiMeta()).toEqual({
      domain: "localhost",
      csp: {
        resourceDomains: ["http://localhost:3000"],
        connectDomains: ["http://localhost:3000"],
        frameDomains: [],
        baseUriDomains: [],
      },
    });
  });

  it("rejects unsupported issuer protocols", () => {
    applyEnv({
      OAUTH_ISSUER: "ftp://stats.cleoai.cloud",
    });

    expect(() => resolveWidgetUiMeta()).toThrow(/Unsupported OAUTH_ISSUER protocol/);
  });

  it("rejects invalid issuer urls", () => {
    applyEnv({
      OAUTH_ISSUER: "https://",
    });

    expect(() => resolveWidgetUiMeta()).toThrow(/Invalid OAUTH_ISSUER/);
  });
});
