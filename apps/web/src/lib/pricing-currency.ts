export const PRICING_CURRENCY_COOKIE_NAME = "pricing_currency"
export const SUPPORTED_PRICING_CURRENCIES = [
  "GBP",
  "USD",
  "CAD",
  "EUR",
] as const

export type SupportedPricingCurrency =
  (typeof SUPPORTED_PRICING_CURRENCIES)[number]

const EURO_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
])

export function normalizePricingCurrency(
  value: string | null | undefined
): SupportedPricingCurrency | null {
  if (typeof value !== "string") {
    return null
  }

  const normalizedValue = value.trim().toUpperCase()

  return SUPPORTED_PRICING_CURRENCIES.includes(
    normalizedValue as SupportedPricingCurrency
  )
    ? (normalizedValue as SupportedPricingCurrency)
    : null
}

export function resolveLocationCurrency(
  countryCode: string | null | undefined
): SupportedPricingCurrency {
  const normalizedCountryCode = countryCode?.trim().toUpperCase()

  switch (normalizedCountryCode) {
    case "US":
      return "USD"
    case "CA":
      return "CAD"
    case "GB":
      return "GBP"
    default:
      return normalizedCountryCode && EURO_COUNTRY_CODES.has(normalizedCountryCode)
        ? "EUR"
        : "GBP"
  }
}
