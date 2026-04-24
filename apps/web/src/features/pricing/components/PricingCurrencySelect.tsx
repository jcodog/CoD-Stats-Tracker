"use client"

import { useRouter } from "next/navigation"
import { startTransition, useEffect, useRef } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { usePricingCurrencyStore } from "@/features/pricing/lib/pricing-currency-store"
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
  const storedCurrency = usePricingCurrencyStore(
    (state) => state.selectedCurrency
  )
  const setSelectedCurrency = usePricingCurrencyStore(
    (state) => state.setSelectedCurrency
  )
  const lastAppliedCurrencyRef = useRef<SupportedPricingCurrency | null>(null)

  const updateCurrency = (nextValue: SupportedPricingCurrency) => {
    setSelectedCurrency(nextValue)
    document.cookie = `${PRICING_CURRENCY_COOKIE_NAME}=${nextValue}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    startTransition(() => router.refresh())
  }

  useEffect(() => {
    if (storedCurrency && currencies.includes(storedCurrency)) {
      if (
        storedCurrency !== value &&
        lastAppliedCurrencyRef.current !== storedCurrency
      ) {
        lastAppliedCurrencyRef.current = storedCurrency
        updateCurrency(storedCurrency)
      }

      return
    }

    setSelectedCurrency(value)
  }, [currencies, storedCurrency, value])

  if (currencies.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-3 sm:justify-end">
      <span className="text-sm text-foreground/72">Currency</span>
      <Select
        onValueChange={(nextValue) =>
          updateCurrency(nextValue as SupportedPricingCurrency)
        }
        value={value}
      >
        <SelectTrigger
          aria-label="Pricing currency"
          className="w-[7.5rem] bg-background/75"
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
    </div>
  )
}
