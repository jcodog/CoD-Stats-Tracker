"use client"

import { create } from "zustand"

export type CreateSessionStep = "review" | "startSr" | "username"
export type UsernameSelectionMode = "existing" | "new"

type CreateSessionFlowState = {
  isSubmitting: boolean
  newUsernameInput: string
  selectedExistingUsernameId: string | null
  selectionMode: UsernameSelectionMode
  setField: <TKey extends keyof Pick<
    CreateSessionFlowState,
    | "isSubmitting"
    | "newUsernameInput"
    | "selectedExistingUsernameId"
    | "selectionMode"
    | "startSr"
    | "step"
  >>(
    key: TKey,
    value: CreateSessionFlowState[TKey]
  ) => void
  startSr: string
  step: CreateSessionStep
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

const stepOrder: CreateSessionStep[] = ["username", "startSr", "review"]

function getInitialState() {
  return {
    isSubmitting: false,
    newUsernameInput: "",
    selectedExistingUsernameId: null,
    selectionMode: "existing" as const,
    startSr: "",
    step: "username" as const,
  }
}

export const useCreateSessionFlowStore = create<CreateSessionFlowState>((set) => ({
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
  reset: () => set(getInitialState()),
  setField: (key, value) => set({ [key]: value } as Partial<CreateSessionFlowState>),
}))
