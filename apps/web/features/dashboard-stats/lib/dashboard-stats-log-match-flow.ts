"use client"

import type { DashboardMatchLoggingMode } from "@/features/dashboard-stats/lib/dashboard-stats-logging-mode"

export type LogMatchStep =
  | "map"
  | "mode"
  | "notes"
  | "outcome"
  | "review"
  | "session"
  | "srChange"
  | "stats"

type LogMatchStepDefinition = {
  description: string
  label: string
  title: string
}

const basicStepDefinitions: Record<LogMatchStep, LogMatchStepDefinition> = {
  map: {
    description:
      "Search only the maps that support the selected ranked mode for the current title.",
    label: "Map",
    title: "Choose the map",
  },
  mode: {
    description:
      "Ranked mode is required and determines which maps are valid on the next step.",
    label: "Mode",
    title: "Pick the ranked mode",
  },
  notes: {
    description: "Notes are only available in Comprehensive mode.",
    label: "Notes",
    title: "Notes",
  },
  outcome: {
    description:
      "Start with the match result so the rest of the log stays fast and predictable.",
    label: "Outcome",
    title: "Record the match result",
  },
  review: {
    description:
      "Check the essentials before the match is written into the active session.",
    label: "Review",
    title: "Review & submit",
  },
  session: {
    description:
      "Choose which active session should receive this match before you continue.",
    label: "Session",
    title: "Choose the session",
  },
  srChange: {
    description:
      "Use the exact SR delta shown in game. Enter a whole number with the sign if needed.",
    label: "SR",
    title: "Record the SR change",
  },
  stats: {
    description: "Optional stats are only available in Comprehensive mode.",
    label: "Stats",
    title: "Optional stats",
  },
}

const comprehensiveStepDefinitions: Record<
  LogMatchStep,
  LogMatchStepDefinition
> = {
  map: {
    description:
      "Search only the maps that support the selected ranked mode for the current title.",
    label: "Map",
    title: "Choose the map",
  },
  mode: {
    description:
      "Ranked mode is required and determines which maps are valid on the next step.",
    label: "Mode",
    title: "Pick the ranked mode",
  },
  notes: {
    description:
      "Keep notes short and plain text so they stay useful during later review.",
    label: "Notes",
    title: "Add notes",
  },
  outcome: {
    description:
      "Start with the match result so the rest of the log stays fast and predictable.",
    label: "Outcome",
    title: "Record the match result",
  },
  review: {
    description:
      "Review everything that will update the session before you submit the match.",
    label: "Review",
    title: "Review & submit",
  },
  session: {
    description:
      "Choose which active session should receive this match before you continue.",
    label: "Session",
    title: "Choose the session",
  },
  srChange: {
    description:
      "Use the exact SR delta shown in game. Enter a whole number with the sign if needed.",
    label: "SR",
    title: "Record the SR change",
  },
  stats: {
    description:
      "Optional stats stay lightweight, but this is where richer match context belongs.",
    label: "Stats",
    title: "Add optional stats",
  },
}

export function getLogMatchStepDefinition(
  step: LogMatchStep,
  loggingMode: DashboardMatchLoggingMode
) {
  return loggingMode === "basic"
    ? basicStepDefinitions[step]
    : comprehensiveStepDefinitions[step]
}

export function getVisibleLogMatchSteps(args: {
  loggingMode: DashboardMatchLoggingMode
  requiresSessionSelection: boolean
}): LogMatchStep[] {
  const baseSteps: LogMatchStep[] =
    args.loggingMode === "basic"
      ? ["outcome", "srChange", "mode", "map", "review"]
      : ["outcome", "srChange", "mode", "map", "stats", "notes", "review"]

  return args.requiresSessionSelection ? ["session", ...baseSteps] : baseSteps
}

export function hasWholeNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number.isInteger(Number(trimmedValue)) : false
}

export function sanitizeSrChangeInput(value: string) {
  return value.replace(/\D/g, "")
}

export function parseRequiredInteger(value: string, fieldLabel: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    throw new Error(`${fieldLabel} is required.`)
  }

  const parsedValue = Number(trimmedValue)
  if (!Number.isInteger(parsedValue)) {
    throw new Error(`${fieldLabel} must be a whole number.`)
  }

  return parsedValue
}

export function getSignedSrChange(
  value: string,
  outcome: "loss" | "win" | null
) {
  const parsedValue = parseRequiredInteger(value, "SR change")
  return outcome === "loss" ? -Math.abs(parsedValue) : Math.abs(parsedValue)
}

export function parseOptionalInteger(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return undefined
  }

  const parsedValue = Number(trimmedValue)
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error("Optional stat fields must be non-negative whole numbers.")
  }

  return parsedValue
}
