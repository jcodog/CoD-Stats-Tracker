import { afterEach, describe, expect, it } from "bun:test"
import { getCheckoutAvailability } from "../queries/billing/catalog.ts"
import {
  createSubscriptionCheckoutSession,
  previewCheckoutQuote,
} from "../actions/billing/customer.ts"
import { resetConvexEnvForTests } from "../../src/env.ts"

const original = process.env.BILLING_CHECKOUT_ENABLED
const input = { interval: "month", planKey: "premium" }
const actions = [createSubscriptionCheckoutSession, previewCheckoutQuote]

function setPolicy(value) {
  if (value === undefined) delete process.env.BILLING_CHECKOUT_ENABLED
  else process.env.BILLING_CHECKOUT_ENABLED = value
  resetConvexEnvForTests()
}

afterEach(() => setPolicy(original))

describe("checkout availability and action enforcement", () => {
  for (const value of [undefined, "false", "invalid", ""]) {
    it(`fails closed for ${String(value)} before any external work`, async () => {
      setPolicy(value)
      expect(await getCheckoutAvailability._handler({}, {})).toBe(false)
      for (const action of actions) {
        // No auth/database/Stripe facilities: disabled checkout must stop first.
        await expect(action._handler({}, input)).rejects.toMatchObject({
          code: "checkout_disabled",
          status: 403,
        })
      }
    })
  }

  it("enables presentation while still requiring authentication", async () => {
    setPolicy("true")
    expect(await getCheckoutAvailability._handler({}, {})).toBe(true)
    const ctx = { auth: { getUserIdentity: async () => null } }
    for (const action of actions) {
      await expect(action._handler(ctx, input)).rejects.toMatchObject({
        code: "unauthenticated",
        status: 401,
      })
    }
  })

  it("does not consult stale snapshots or user allowlists", async () => {
    setPolicy("false")
    for (const subject of ["ordinary", "allowlisted", "admin"]) {
      const ctx = {
        auth: { getUserIdentity: async () => ({ subject }) },
        runQuery: () => {
          throw new Error("Must not read the old flag mirror")
        },
      }
      await expect(
        createSubscriptionCheckoutSession._handler(ctx, input)
      ).rejects.toMatchObject({ code: "checkout_disabled" })
    }
  })
})
