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
  it("accepts codstats.tech in production", () => {
    setEnv("production", "https://codstats.tech");

    expect(getAppPublicOrigin()).toBe("https://codstats.tech");
  });

  it("accepts dev.codstats.tech in production", () => {
    setEnv("production", "https://dev.codstats.tech");

    expect(getAppPublicOrigin()).toBe("https://dev.codstats.tech");
  });

  it("rejects unapproved hostnames in production", () => {
    setEnv("production", "https://preview.example.com");

    expect(() => getAppPublicOrigin()).toThrow(
      /APP_PUBLIC_ORIGIN must use one of codstats\.tech, www\.codstats\.tech, dev\.codstats\.tech in production/,
    );
  });

  it("requires an https app origin and rejects missing config", () => {
    setEnv("test", undefined);
    expect(() => getAppPublicOrigin()).toThrow(/Missing required env var APP_PUBLIC_ORIGIN/);

    setEnv("test", "http://dev.codstats.tech");
    expect(() => getAppPublicOrigin()).toThrow(/APP_PUBLIC_ORIGIN must use https:\/\//);

    setEnv("test", "not-a-url");
    expect(() => getAppPublicOrigin()).toThrow(/Invalid APP_PUBLIC_ORIGIN/);
  });

  it("normalizes request origins and rejects mismatches in production", () => {
    setEnv("production", "https://dev.codstats.tech");

    expect(
      getAppPublicOrigin(new Request("https://dev.codstats.tech/dashboard")),
    ).toBe("https://dev.codstats.tech");
    expect(
      getAppPublicOrigin(new URL("https://dev.codstats.tech/dashboard")),
    ).toBe("https://dev.codstats.tech");
    expect(getAppPublicOrigin("https://dev.codstats.tech")).toBe(
      "https://dev.codstats.tech",
    );

    expect(() =>
      getAppPublicOrigin("https://preview.example.com"),
    ).toThrow(/does not match APP_PUBLIC_ORIGIN/);
    expect(() => getAppPublicOrigin("not-a-url")).toThrow(/Invalid request origin/);
  });

  it("builds the hosted codstats template urls and ui resource uris", () => {
    setEnv("test", "https://dev.codstats.tech");

    expect(getCodstatsTemplateResourceUri("widget")).toBe("ui://codstats/widget.html");
    expect(getCodstatsTemplateUrl("rank")).toBe(
      "https://dev.codstats.tech/ui/codstats/rank.html",
    );
    expect(getCodstatsWidgetTemplateUrl()).toBe(
      "https://dev.codstats.tech/ui/codstats/widget.html",
    );
    expect(getCodstatsTemplateUrls()).toEqual({
      widget: "https://dev.codstats.tech/ui/codstats/widget.html",
      session: "https://dev.codstats.tech/ui/codstats/session.html",
      matches: "https://dev.codstats.tech/ui/codstats/matches.html",
      rank: "https://dev.codstats.tech/ui/codstats/rank.html",
      settings: "https://dev.codstats.tech/ui/codstats/settings.html",
    });
  });
});
