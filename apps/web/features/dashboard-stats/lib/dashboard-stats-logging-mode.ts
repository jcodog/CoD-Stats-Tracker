"use client"

export const DASHBOARD_MATCH_LOGGING_MODES = ["comprehensive", "basic"] as const

export type DashboardMatchLoggingMode =
  (typeof DASHBOARD_MATCH_LOGGING_MODES)[number]

export const DEFAULT_DASHBOARD_MATCH_LOGGING_MODE: DashboardMatchLoggingMode =
  "comprehensive"

export const DASHBOARD_MATCH_LOGGING_MODE_LABELS: Record<
  DashboardMatchLoggingMode,
  string
> = {
  basic: "Basic",
  comprehensive: "Comprehensive",
}
