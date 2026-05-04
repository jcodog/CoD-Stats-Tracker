import Stripe from "stripe"

import { getSubscriptionItemCurrentPeriodEnd } from "../../../../src/lib/stripe/billing"

type StripeCheckoutSessionCreateParams = NonNullable<
  Parameters<Stripe["checkout"]["sessions"]["create"]>[0]
>

export function buildCheckoutSuccessUrl(appOrigin: string) {
  return `${appOrigin}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`
}

export function buildCheckoutCancelUrl(appOrigin: string) {
  return `${appOrigin}/checkout/cancelled`
}

export function hasStripeSubscriptionEnded(
  subscription: Stripe.Subscription,
  now = Date.now()
) {
  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired" ||
    subscription.status === "unpaid"
  ) {
    return true
  }

  if (
    typeof subscription.ended_at === "number" &&
    subscription.ended_at * 1000 <= now
  ) {
    return true
  }

  if (
    typeof subscription.cancel_at === "number" &&
    subscription.cancel_at * 1000 <= now
  ) {
    return true
  }

  if (
    subscription.cancel_at_period_end &&
    (getSubscriptionItemCurrentPeriodEnd(subscription) ??
      Number.POSITIVE_INFINITY) <= now
  ) {
    return true
  }

  return false
}

export function shouldBlockNewCheckout(
  subscription: Stripe.Subscription,
  now = Date.now()
) {
  return !hasStripeSubscriptionEnded(subscription, now)
}

export async function createHostedSubscriptionCheckoutSession(args: {
  cancelUrl: string
  customerId: string
  discountCouponId?: string
  lineItemPriceId: string
  metadata: Stripe.MetadataParam
  stripe: Stripe
  successUrl: string
  userId: string
}) {
  return await args.stripe.checkout.sessions.create(
    {
      adaptive_pricing: {
        enabled: true,
      },
      cancel_url: args.cancelUrl,
      client_reference_id: args.userId,
      customer: args.customerId,
      discounts: args.discountCouponId
        ? [{ coupon: args.discountCouponId }]
        : undefined,
      line_items: [{ price: args.lineItemPriceId, quantity: 1 }],
      metadata: args.metadata,
      mode: "subscription",
      subscription_data: {
        metadata: args.metadata,
      },
      success_url: args.successUrl,
      ui_mode: "hosted" as unknown as StripeCheckoutSessionCreateParams["ui_mode"],
    }
  )
}
