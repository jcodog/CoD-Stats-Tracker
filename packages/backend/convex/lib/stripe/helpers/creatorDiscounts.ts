import Stripe from "stripe"

import { STRIPE_CATALOG_APP } from "../../../../src/lib/stripe/client"

export function buildCreatorDiscountCouponId(args: {
  creatorCode: string
  discountPercent: number
}) {
  return [
    "creator",
    "once",
    args.creatorCode.toLowerCase(),
    String(args.discountPercent),
  ].join("_")
}

export function buildCreatorDiscountCouponCreateParams(args: {
  creatorCode: string
  discountPercent: number
}): Stripe.CouponCreateParams {
  return {
    duration: "once",
    id: buildCreatorDiscountCouponId(args),
    metadata: {
      app: STRIPE_CATALOG_APP,
      creatorCode: args.creatorCode,
      kind: "creator_discount",
    },
    name: `${args.creatorCode} first payment discount`,
    percent_off: args.discountPercent,
  }
}
