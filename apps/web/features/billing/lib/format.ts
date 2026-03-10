import type { BillingInterval } from "@/features/billing/lib/billing-types"

export function formatCurrencyAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100)
}

export function formatBillingInterval(interval: BillingInterval) {
  return interval === "year" ? "yearly" : "monthly"
}

export function formatDateLabel(value: number | null | undefined) {
  if (!value) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(value)
}
