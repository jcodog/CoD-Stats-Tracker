"use client"

import { useRouter } from "next/navigation"
import { startTransition } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import {
  PRICING_CURRENCY_COOKIE_NAME,
  type SupportedPricingCurrency,
} from "@/lib/pricing-currency"

type PricingCurrencySelectProps = {
  currencies: SupportedPricingCurrency[]
  value: SupportedPricingCurrency
}

export function PricingCurrencySelect({
  currencies,
  value,
}: PricingCurrencySelectProps) {
  const router = useRouter()

  if (currencies.length <= 1) {
    return null
  }

  return (
    <Select
      onValueChange={(nextValue) => {
        document.cookie = `${PRICING_CURRENCY_COOKIE_NAME}=${nextValue}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
        startTransition(() => router.refresh())
      }}
      value={value}
    >
      <SelectTrigger
        aria-label="Pricing currency"
        className="w-[7.5rem] rounded-full bg-background/75"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
