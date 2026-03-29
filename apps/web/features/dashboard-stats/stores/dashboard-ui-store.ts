"use client"

import { create } from "zustand"

export type DashboardTimeRange = "14d" | "30d" | "7d" | "all"

type DashboardUiState = {
  includeLossProtected: boolean
  selectedSessionId: string | null
  selectedTimeRange: DashboardTimeRange
  setIncludeLossProtected: (includeLossProtected: boolean) => void
  setSelectedSessionId: (selectedSessionId: string | null) => void
  setSelectedTimeRange: (selectedTimeRange: DashboardTimeRange) => void
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  includeLossProtected: true,
  selectedSessionId: null,
  selectedTimeRange: "all",
  setIncludeLossProtected: (includeLossProtected) => set({ includeLossProtected }),
  setSelectedSessionId: (selectedSessionId) => set({ selectedSessionId }),
  setSelectedTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
}))
