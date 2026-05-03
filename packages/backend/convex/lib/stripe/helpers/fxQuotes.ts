import { getConvexEnv } from "../../../../src/env"

export type FxQuoteCurrency = "CAD" | "EUR" | "GBP" | "USD"

type StripeFxQuote = {
  id: string
  lock_expires_at?: number | null
  lock_status?: "active" | "expired" | "none" | string
  rates?: Record<
    string,
    {
      exchange_rate?: number | null
    }
  >
  to_currency: string
}

const STRIPE_FX_QUOTES_API_VERSION = "2025-07-30.preview"

function getStripeSecretKey() {
  const stripeSecretKey = getConvexEnv().STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  return stripeSecretKey
}

export async function createGbpEstimateFxQuote(args: {
  estimateCurrency: Exclude<FxQuoteCurrency, "GBP">
}) {
  const body = new URLSearchParams()
  body.set("to_currency", "gbp")
  body.append("from_currencies[]", args.estimateCurrency.toLowerCase())
  body.set("lock_duration", "none")

  const response = await fetch("https://api.stripe.com/v1/fx_quotes", {
    body,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_FX_QUOTES_API_VERSION,
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Stripe FX quote request failed.")
  }

  const quote = (await response.json()) as StripeFxQuote
  const rate =
    quote.rates?.[args.estimateCurrency.toLowerCase()]?.exchange_rate ?? null

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Stripe FX quote did not include a usable exchange rate.")
  }

  return {
    quoteId: quote.id,
    rate,
  }
}

export function estimateFromGbpMinorUnits(args: {
  amount: number
  rate: number
}) {
  return Math.max(0, Math.round(args.amount / args.rate))
}
