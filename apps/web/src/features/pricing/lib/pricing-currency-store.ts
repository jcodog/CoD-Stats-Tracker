"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { SupportedPricingCurrency } from "@/lib/pricing-currency"

type PricingCurrencyState = {
  selectedCurrency: SupportedPricingCurrency | null
  setSelectedCurrency: (currency: SupportedPricingCurrency) => void
}

export const usePricingCurrencyStore = create<PricingCurrencyState>()(
  persist(
    (set) => ({
      selectedCurrency: null,
      setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
    }),
    {
      name: "codstats-pricing-currency",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
