"use client"

import { create } from "zustand"

import {
  DEFAULT_DASHBOARD_MATCH_LOGGING_MODE,
  type DashboardMatchLoggingMode,
} from "@/features/dashboard-stats/lib/dashboard-stats-logging-mode"

export type DashboardTimeRange = "14d" | "30d" | "7d" | "all"

type DashboardUiState = {
  hasSyncedLoggingMode: boolean
  includeLossProtected: boolean
  selectedLoggingMode: DashboardMatchLoggingMode
  selectedSessionId: string | null
  selectedTimeRange: DashboardTimeRange
  setSelectedLoggingMode: (
    selectedLoggingMode: DashboardMatchLoggingMode
  ) => void
  setIncludeLossProtected: (includeLossProtected: boolean) => void
  setSelectedSessionId: (selectedSessionId: string | null) => void
  setSelectedTimeRange: (selectedTimeRange: DashboardTimeRange) => void
  syncSelectedLoggingMode: (
    selectedLoggingMode: DashboardMatchLoggingMode
  ) => void
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  hasSyncedLoggingMode: false,
  includeLossProtected: true,
  selectedLoggingMode: DEFAULT_DASHBOARD_MATCH_LOGGING_MODE,
  selectedSessionId: null,
  selectedTimeRange: "all",
  setSelectedLoggingMode: (selectedLoggingMode) =>
    set({
      hasSyncedLoggingMode: true,
      selectedLoggingMode,
    }),
  setIncludeLossProtected: (includeLossProtected) =>
    set({ includeLossProtected }),
  setSelectedSessionId: (selectedSessionId) => set({ selectedSessionId }),
  setSelectedTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
  syncSelectedLoggingMode: (selectedLoggingMode) =>
    set((state) =>
      state.hasSyncedLoggingMode &&
      state.selectedLoggingMode === selectedLoggingMode
        ? state
        : {
            hasSyncedLoggingMode: true,
            selectedLoggingMode,
          }
    ),
}))
