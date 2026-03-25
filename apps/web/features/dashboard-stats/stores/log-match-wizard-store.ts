"use client"

import { create } from "zustand"

export type LogMatchStep =
  | "map"
  | "mode"
  | "notes"
  | "stats"
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
  reset: (selectedSessionId?: string | null) => void
}

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
  reset: (selectedSessionId = null) => set(getInitialState(selectedSessionId)),
  setField: (key, value) => set({ [key]: value } as Partial<LogMatchWizardState>),
}))
