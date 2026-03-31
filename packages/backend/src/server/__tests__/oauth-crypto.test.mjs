import { describe, expect, it } from "bun:test";

import {
  generateRandomToken,
  safeStringEqual,
  sha256Base64Url,
} from "../oauth/crypto.ts";

describe("oauth crypto helpers", () => {
  it("hashes values as base64url sha256", () => {
    expect(sha256Base64Url("codstats")).toBe(
      "HrLBX1fwZA_KsEqm6CPK2ac3W9E3xr12GFLgiockrGE",
    );
  });

  it("generates base64url-safe random tokens at the requested size", () => {
    const small = generateRandomToken(8);
    const large = generateRandomToken(48);

    expect(small).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(large).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(small.length).toBeGreaterThan(0);
    expect(large.length).toBeGreaterThan(small.length);
    expect(generateRandomToken(8)).not.toBe(small);
  });

  it("compares strings with timing-safe equality semantics", () => {
    expect(safeStringEqual("codstats", "codstats")).toBe(true);
    expect(safeStringEqual("codstats", "codstatx")).toBe(false);
    expect(safeStringEqual("codstats", "short")).toBe(false);
  });
});
