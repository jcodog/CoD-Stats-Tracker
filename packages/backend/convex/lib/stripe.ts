import Stripe from "stripe"
import { getConvexEnv } from "../env"

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const

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
