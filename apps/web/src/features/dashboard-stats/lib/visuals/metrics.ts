import type { CSSProperties } from "react"

export const DASHBOARD_POSITIVE_COLOR = "var(--dashboard-positive)"
export const DASHBOARD_NEGATIVE_COLOR = "var(--dashboard-negative)"
export const DASHBOARD_NEUTRAL_COLOR = "var(--dashboard-neutral)"

type DashboardMetricTone = "negative" | "neutral" | "positive"

function getDashboardMetricTone(value: number): DashboardMetricTone {
  if (value > 0) {
    return "positive"
  }

  if (value < 0) {
    return "negative"
  }

  return "neutral"
}

export function getDashboardMetricColor(value: number) {
  const tone = getDashboardMetricTone(value)

  if (tone === "positive") {
    return DASHBOARD_POSITIVE_COLOR
  }

  if (tone === "negative") {
    return DASHBOARD_NEGATIVE_COLOR
  }

  return DASHBOARD_NEUTRAL_COLOR
}

export function getDashboardMetricTextStyle(
  value: number
): CSSProperties | undefined {
  const tone = getDashboardMetricTone(value)

  if (tone === "neutral") {
    return undefined
  }

  return { color: getDashboardMetricColor(value) }
}

function getDashboardTintedSurfaceStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
    borderColor: `color-mix(in oklab, ${color} 24%, transparent)`,
    color,
  }
}

export function getDashboardOutcomeBadgeStyle(
  outcome: "loss" | "win"
): CSSProperties {
  return getDashboardTintedSurfaceStyle(
    outcome === "win" ? DASHBOARD_POSITIVE_COLOR : DASHBOARD_NEGATIVE_COLOR
  )
}
