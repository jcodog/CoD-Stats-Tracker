import { describe, expect, it } from "bun:test"
import Stripe from "stripe"

import {
  getCreatorConnectV2AccountId,
  isCreatorConnectV2EventNotification,
  parseStripeV2EventNotification,
} from "../stripe/connectEvents.ts"

const secret = "whsec_connect_v2_test"
const stripe = new Stripe("sk_test_connect_v2")

function buildPayload(type) {
  return JSON.stringify({
    created: "2026-08-03T12:00:00.000Z",
    id: "evt_test_connect_v2",
    livemode: false,
    object: "v2.core.event",
    related_object: {
      id: "acct_test_connect_v2",
      type: "v2.core.account",
      url: "/v2/core/accounts/acct_test_connect_v2",
    },
    type,
  })
}

describe("Stripe Connect v2 event notifications", () => {
  for (const type of [
    "v2.core.account[requirements].updated",
    "v2.core.account[configuration.recipient].capability_status_updated",
  ]) {
    it(`verifies and accepts ${type}`, async () => {
      const payload = buildPayload(type)
      const signature = await stripe.webhooks.generateTestHeaderStringAsync({
        payload,
        secret,
      })
      const event = await parseStripeV2EventNotification({
        payload,
        secret,
        signature,
        stripe,
      })

      expect(isCreatorConnectV2EventNotification(event)).toBe(true)
      expect(getCreatorConnectV2AccountId(event)).toBe(
        "acct_test_connect_v2"
      )
    })
  }

  it("rejects an invalid signature", async () => {
    await expect(
      parseStripeV2EventNotification({
        payload: buildPayload(
          "v2.core.account[requirements].updated"
        ),
        secret,
        signature: "t=1,v1=invalid",
        stripe,
      })
    ).rejects.toThrow()
  })
})
