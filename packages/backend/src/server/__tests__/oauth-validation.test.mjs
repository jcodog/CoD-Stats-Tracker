import { describe, expect, it } from "bun:test";

import {
  assertScopeSubset,
  assertScopesAllowed,
  parseScope,
} from "../oauth/validation.ts";

describe("oauth scope validation", () => {
  it("parses, normalizes, and deduplicates scopes", () => {
    expect(parseScope(null)).toEqual({
      scopes: [],
      scope: "",
    });

    expect(parseScope(" profile.read   stats.read profile.read ")).toEqual({
      scopes: ["profile.read", "stats.read"],
      scope: "profile.read stats.read",
    });
  });

  it("rejects empty, invalid, or oversized scope values", () => {
    expect(() => parseScope("   ")).toThrow(/scope is empty/);
    expect(() => parseScope("stats.read,$")).toThrow(/scope has invalid characters/);
    expect(() =>
      parseScope(Array.from({ length: 21 }, (_, index) => `scope${index}`).join(" ")),
    ).toThrow(/scope has too many items/);
    expect(() => parseScope(`scope:${"a".repeat(129)}`)).toThrow(
      /scope value too long/,
    );
  });

  it("enforces allowed scope lists and granted scope subsets", () => {
    expect(() =>
      assertScopesAllowed(["profile.read", "admin.write"], new Set(["profile.read"])),
    ).toThrow(/scope_not_allowed:admin.write/);

    expect(() =>
      assertScopeSubset(["stats.read"], ["profile.read"]),
    ).toThrow(/scope_not_granted:stats.read/);

    expect(() =>
      assertScopesAllowed(["profile.read"], null),
    ).not.toThrow();
    expect(() =>
      assertScopeSubset(["profile.read"], ["profile.read", "stats.read"]),
    ).not.toThrow();
  });
});

