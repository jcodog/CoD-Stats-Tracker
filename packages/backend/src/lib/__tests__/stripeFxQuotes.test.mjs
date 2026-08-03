import { describe, expect, it } from "bun:test"

import {
  buildGbpEstimateFxQuoteBody,
  estimateFromGbpMinorUnits,
  getGbpEstimateRate,
} from "../../../convex/lib/stripe/helpers/fxQuotes.ts"
import {
  getEstimatedPricingSnapshot,
  resolveDisplayedPricingCurrency,
} from "../../../convex/actions/billing/customer.ts"

describe("Stripe FX quote estimates", () => {
  for (const [currency, rate, expected] of [
    ["USD", 0.8, 1250],
    ["EUR", 0.85, 1176],
    ["CAD", 0.6, 1667],
  ]) {
    it(`quotes ${currency} to GBP and divides the GBP catalogue amount`, () => {
      const body = buildGbpEstimateFxQuoteBody(currency)
      const quote = {
        id: `fxq_${currency.toLowerCase()}`,
        rates: {
          [currency.toLowerCase()]: { exchange_rate: rate },
        },
        to_currency: "gbp",
      }

      expect(body.get("to_currency")).toBe("gbp")
      expect(body.getAll("from_currencies[]")).toEqual([
        currency.toLowerCase(),
      ])
      expect(
        estimateFromGbpMinorUnits({
          amount: 1000,
          rate: getGbpEstimateRate(quote, currency),
        })
      ).toBe(expected)
    })
  }

  it("passes GBP catalogue amounts through without conversion", () => {
    expect(estimateFromGbpMinorUnits({ amount: 1000, rate: 1 })).toBe(1000)
  })

  it("rejects missing and invalid rates so callers can fall back to GBP", () => {
    expect(() =>
      getGbpEstimateRate(
        { id: "fxq_missing", rates: {}, to_currency: "gbp" },
        "USD"
      )
    ).toThrow("usable exchange rate")
    expect(() => estimateFromGbpMinorUnits({ amount: 1000, rate: 0 })).toThrow(
      "positive FX rate"
    )
    expect(
      resolveDisplayedPricingCurrency({ estimateCurrency: "CAD", fxRate: null })
    ).toBe("GBP")
  })

  it("applies the same estimate calculation to public and customer catalogues", () => {
    const publicPricing = { amount: 1000, currency: "GBP", interval: "month" }
    const customerPricing = { ...publicPricing }
    const args = { estimateCurrency: "USD", fxRate: 0.8 }

    expect(
      getEstimatedPricingSnapshot({ ...args, pricing: publicPricing })
    ).toEqual(
      getEstimatedPricingSnapshot({ ...args, pricing: customerPricing })
    )
    expect(resolveDisplayedPricingCurrency(args)).toBe("USD")
  })
})
