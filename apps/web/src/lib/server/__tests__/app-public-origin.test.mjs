import { afterAll, describe, expect, it } from "bun:test";

import {
  getAppPublicOrigin,
  getCodstatsTemplateResourceUri,
  getCodstatsTemplateUrl,
  getCodstatsTemplateUrls,
  getCodstatsWidgetTemplateUrl,
} from "@workspace/backend/server/app-public-origin";
import { resetServerEnvForTests } from "@workspace/backend/server/env";

const previousNodeEnv = process.env.NODE_ENV;
const previousAppPublicOrigin = process.env.APP_PUBLIC_ORIGIN;

function setEnv(nodeEnv, appPublicOrigin) {
  if (nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }

  if (appPublicOrigin === undefined) {
    delete process.env.APP_PUBLIC_ORIGIN;
  } else {
    process.env.APP_PUBLIC_ORIGIN = appPublicOrigin;
  }

  resetServerEnvForTests();
}

afterAll(() => {
  setEnv(previousNodeEnv, previousAppPublicOrigin);
});

describe("getAppPublicOrigin", () => {
  it("accepts stats.cleoai.cloud in production", () => {
    setEnv("production", "https://stats.cleoai.cloud");

    expect(getAppPublicOrigin()).toBe("https://stats.cleoai.cloud");
  });

  it("accepts stats-dev.cleoai.cloud in production", () => {
    setEnv("production", "https://stats-dev.cleoai.cloud");

    expect(getAppPublicOrigin()).toBe("https://stats-dev.cleoai.cloud");
  });

  it("rejects unapproved hostnames in production", () => {
    setEnv("production", "https://preview.example.com");

    expect(() => getAppPublicOrigin()).toThrow(
      /APP_PUBLIC_ORIGIN must use one of stats\.cleoai\.cloud, stats-dev\.cleoai\.cloud in production/,
    );
  });

  it("requires an https app origin and rejects missing config", () => {
    setEnv("test", undefined);
    expect(() => getAppPublicOrigin()).toThrow(/Missing required env var APP_PUBLIC_ORIGIN/);

    setEnv("test", "http://stats-dev.cleoai.cloud");
    expect(() => getAppPublicOrigin()).toThrow(/APP_PUBLIC_ORIGIN must use https:\/\//);

    setEnv("test", "not-a-url");
    expect(() => getAppPublicOrigin()).toThrow(/Invalid APP_PUBLIC_ORIGIN/);
  });

  it("normalizes request origins and rejects mismatches in production", () => {
    setEnv("production", "https://stats-dev.cleoai.cloud");

    expect(
      getAppPublicOrigin(new Request("https://stats-dev.cleoai.cloud/dashboard")),
    ).toBe("https://stats-dev.cleoai.cloud");
    expect(
      getAppPublicOrigin(new URL("https://stats-dev.cleoai.cloud/dashboard")),
    ).toBe("https://stats-dev.cleoai.cloud");
    expect(getAppPublicOrigin("https://stats-dev.cleoai.cloud")).toBe(
      "https://stats-dev.cleoai.cloud",
    );

    expect(() =>
      getAppPublicOrigin("https://preview.example.com"),
    ).toThrow(/does not match APP_PUBLIC_ORIGIN/);
    expect(() => getAppPublicOrigin("not-a-url")).toThrow(/Invalid request origin/);
  });

  it("builds the hosted codstats template urls and ui resource uris", () => {
    setEnv("test", "https://stats-dev.cleoai.cloud");

    expect(getCodstatsTemplateResourceUri("widget")).toBe("ui://codstats/widget.html");
    expect(getCodstatsTemplateUrl("rank")).toBe(
      "https://stats-dev.cleoai.cloud/ui/codstats/rank.html",
    );
    expect(getCodstatsWidgetTemplateUrl()).toBe(
      "https://stats-dev.cleoai.cloud/ui/codstats/widget.html",
    );
    expect(getCodstatsTemplateUrls()).toEqual({
      widget: "https://stats-dev.cleoai.cloud/ui/codstats/widget.html",
      session: "https://stats-dev.cleoai.cloud/ui/codstats/session.html",
      matches: "https://stats-dev.cleoai.cloud/ui/codstats/matches.html",
      rank: "https://stats-dev.cleoai.cloud/ui/codstats/rank.html",
      settings: "https://stats-dev.cleoai.cloud/ui/codstats/settings.html",
    });
  });
});
