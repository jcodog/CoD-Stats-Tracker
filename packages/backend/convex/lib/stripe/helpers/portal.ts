import Stripe from "stripe"

export async function createStripeBillingPortalSession(args: {
  customerId: string
  returnUrl: string
  stripe: Stripe
}) {
  return await args.stripe.billingPortal.sessions.create({
    customer: args.customerId,
    return_url: args.returnUrl,
  })
}
