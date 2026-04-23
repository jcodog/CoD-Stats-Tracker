import "server-only"

import { cookies, headers } from "next/headers"

import {
  PRICING_CURRENCY_COOKIE_NAME,
  normalizePricingCurrency,
  resolveLocationCurrency,
  type SupportedPricingCurrency,
} from "@/lib/pricing-currency"

export async function getPreferredPricingCurrency(): Promise<SupportedPricingCurrency> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const cookieCurrency = normalizePricingCurrency(
    cookieStore.get(PRICING_CURRENCY_COOKIE_NAME)?.value
  )

  if (cookieCurrency) {
    return cookieCurrency
  }

  return resolveLocationCurrency(
    requestHeaders.get("x-vercel-ip-country") ??
      requestHeaders.get("cf-ipcountry")
  )
}
