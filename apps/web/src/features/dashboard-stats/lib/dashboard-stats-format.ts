import type { DashboardTimeRange } from "@/features/dashboard-stats/stores/dashboard-ui-store"

export function formatDashboardDateTime(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

export function formatDashboardDay(value: string) {
  const dateValue = new Date(value)

  if (Number.isNaN(dateValue.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(dateValue)
}

export function formatDashboardPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function getModeLabel(mode: string | null | undefined) {
  if (mode === "hardpoint") {
    return "Hardpoint"
  }

  if (mode === "snd") {
    return "Search and Destroy"
  }

  if (mode === "overload") {
    return "Overload"
  }

  return mode ?? "Legacy log"
}

export function getMapLabel(mapName: string | null | undefined) {
  return mapName ?? "Legacy log"
}

export function getTimeRangeStart(selectedTimeRange: DashboardTimeRange) {
  if (selectedTimeRange === "all") {
    return null
  }

  const now = Date.now()
  const days =
    selectedTimeRange === "7d" ? 7 : selectedTimeRange === "14d" ? 14 : 30

  return now - days * 24 * 60 * 60 * 1_000
}
