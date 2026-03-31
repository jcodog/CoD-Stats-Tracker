import { describe, expect, it } from "bun:test";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_CODE_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  millisecondsFromNow,
  nowInMs,
  nowInSeconds,
  secondsFromNow,
} from "../oauth/time.ts";

describe("oauth time helpers", () => {
  it("exposes the configured OAuth TTL values", () => {
    expect(AUTH_CODE_TTL_SECONDS).toBe(60);
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(15 * 60);
    expect(REFRESH_TOKEN_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it("derives current timestamps in milliseconds and seconds", () => {
    const nowMs = Date.now();
    const nowSeconds = Math.floor(nowMs / 1_000);

    expect(nowInMs()).toBeGreaterThanOrEqual(nowMs - 50);
    expect(nowInMs()).toBeLessThanOrEqual(Date.now() + 50);
    expect(nowInSeconds()).toBeGreaterThanOrEqual(nowSeconds - 1);
    expect(nowInSeconds()).toBeLessThanOrEqual(Math.floor(Date.now() / 1_000) + 1);
  });

  it("adds offsets in both seconds and milliseconds", () => {
    const beforeSeconds = nowInSeconds();
    const beforeMs = nowInMs();

    expect(secondsFromNow(90)).toBeGreaterThanOrEqual(beforeSeconds + 90);
    expect(secondsFromNow(90)).toBeLessThanOrEqual(nowInSeconds() + 90);
    expect(millisecondsFromNow(90)).toBeGreaterThanOrEqual(beforeMs + 90_000);
    expect(millisecondsFromNow(90)).toBeLessThanOrEqual(nowInMs() + 90_000);
  });
});
