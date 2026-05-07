import { describe, expect, it } from "bun:test"

import { getEstimatedPayoutPresentation } from "../creator-panel.ts"

describe("creator payout presentation", () => {
  it("uses monthly payout wording for Stripe-ready creators", () => {
    const presentation = getEstimatedPayoutPresentation({
      connectPayoutReady: true,
      estimatedEarningsByCurrency: [{ amount: 2500, currency: "gbp" }],
      paidConversionCount: 1,
      payoutEligible: true,
    })

    expect(presentation.detail).toBe(
      "This is an estimation of your next monthly payout."
    )
  })

  it("uses missed payout wording for creators without Stripe connected", () => {
    const presentation = getEstimatedPayoutPresentation({
      connectPayoutReady: false,
      estimatedEarningsByCurrency: [{ amount: 2500, currency: "gbp" }],
      paidConversionCount: 1,
      payoutEligible: true,
    })

    expect(presentation.detail).toBe(
      "This is an estimation of what you could have been paid if you had connected Stripe."
    )
  })
})
