"use client"

import { create } from "zustand"

import type { DashboardMatchLoggingMode } from "@/features/dashboard-stats/lib/dashboard-stats-logging-mode"

export type DashboardTimeRange = "14d" | "30d" | "7d" | "all"

type DashboardUiState = {
  includeLossProtected: boolean
  selectedLoggingMode: DashboardMatchLoggingMode | null
  selectedSessionId: string | null
  selectedTimeRange: DashboardTimeRange
  setSelectedLoggingMode: (
    selectedLoggingMode: DashboardMatchLoggingMode
  ) => void
  setIncludeLossProtected: (includeLossProtected: boolean) => void
  setSelectedSessionId: (selectedSessionId: string | null) => void
  setSelectedTimeRange: (selectedTimeRange: DashboardTimeRange) => void
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  includeLossProtected: true,
  selectedLoggingMode: null,
  selectedSessionId: null,
  selectedTimeRange: "all",
  setSelectedLoggingMode: (selectedLoggingMode) => set({ selectedLoggingMode }),
  setIncludeLossProtected: (includeLossProtected) =>
    set({ includeLossProtected }),
  setSelectedSessionId: (selectedSessionId) => set({ selectedSessionId }),
  setSelectedTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
}))
