import Stripe from "stripe"
import { getConvexEnv } from "../../../src/env"

export const STRIPE_API_VERSION: typeof Stripe.API_VERSION = "2026-07-29.dahlia"

export const STRIPE_CATALOG_APP = "cod-stats-tracker"

let cachedStripe: Stripe | null = null
let cachedSecretKey: string | null = null

export function getStripe() {
  const stripeSecretKey = getConvexEnv().STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  if (cachedStripe && cachedSecretKey === stripeSecretKey) {
    return cachedStripe
  }

  cachedSecretKey = stripeSecretKey
  cachedStripe = new Stripe(stripeSecretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  })

  return cachedStripe
}
