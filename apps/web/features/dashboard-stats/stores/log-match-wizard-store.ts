"use client"

import { create } from "zustand"

export type LogMatchStep =
  | "map"
  | "mode"
  | "notes"
  | "optionalStats"
  | "outcome"
  | "review"
  | "session"
  | "srChange"

type LogMatchWizardState = {
  deaths: string
  defuses: string
  enemyScore: string
  hillTimeSeconds: string
  isSubmitting: boolean
  kills: string
  lossProtected: boolean
  mapId: string | null
  modeId: string | null
  notes: string
  outcome: "loss" | "win" | null
  overloads: string
  plants: string
  selectedSessionId: string | null
  setField: <TKey extends keyof Pick<
    LogMatchWizardState,
    | "deaths"
    | "defuses"
    | "enemyScore"
    | "hillTimeSeconds"
    | "isSubmitting"
    | "kills"
    | "lossProtected"
    | "mapId"
    | "modeId"
    | "notes"
    | "outcome"
    | "overloads"
    | "plants"
    | "selectedSessionId"
    | "srChange"
    | "step"
    | "teamScore"
  >>(
    key: TKey,
    value: LogMatchWizardState[TKey]
  ) => void
  srChange: string
  step: LogMatchStep
  teamScore: string
  nextStep: () => void
  prevStep: () => void
  reset: (selectedSessionId?: string | null) => void
}

const stepOrder: LogMatchStep[] = [
  "session",
  "outcome",
  "srChange",
  "mode",
  "map",
  "optionalStats",
  "notes",
  "review",
]

function getInitialState(selectedSessionId: string | null = null) {
  return {
    deaths: "",
    defuses: "",
    enemyScore: "",
    hillTimeSeconds: "",
    isSubmitting: false,
    kills: "",
    lossProtected: false,
    mapId: null,
    modeId: null,
    notes: "",
    outcome: null,
    overloads: "",
    plants: "",
    selectedSessionId,
    srChange: "",
    step: "session" as const,
    teamScore: "",
  }
}

export const useLogMatchWizardStore = create<LogMatchWizardState>((set) => ({
  ...getInitialState(),
  nextStep: () =>
    set((state) => ({
      step:
        stepOrder[Math.min(stepOrder.indexOf(state.step) + 1, stepOrder.length - 1)],
    })),
  prevStep: () =>
    set((state) => ({
      step: stepOrder[Math.max(stepOrder.indexOf(state.step) - 1, 0)],
    })),
  reset: (selectedSessionId = null) => set(getInitialState(selectedSessionId)),
  setField: (key, value) => set({ [key]: value } as Partial<LogMatchWizardState>),
}))
