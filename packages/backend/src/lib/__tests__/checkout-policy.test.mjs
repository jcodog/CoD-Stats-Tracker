import { describe, expect, it } from "bun:test"
import { isCheckoutEnabled } from "../checkoutPolicy.ts"

describe("checkout operational policy", () => {
  it("requires explicit enablement", () => {
    expect(isCheckoutEnabled("true")).toBe(true)
    for (const value of [undefined, "", "false", "TRUE", "1", "stale", " true "]) {
      expect(isCheckoutEnabled(value)).toBe(false)
    }
  })
})
