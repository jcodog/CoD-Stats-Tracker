"use client"

import { useEffect, useEffectEvent, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"

import { AppSelect } from "@/components/AppSelect"
import type { Id } from "@workspace/backend/convex/_generated/dataModel"
import type {
  DashboardAvailableMaps,
  DashboardAvailableModes,
  DashboardState,
} from "@/features/dashboard-stats/lib/dashboard-stats-client"
import {
  DashboardStatsClientError,
  useLogDashboardMatch,
} from "@/features/dashboard-stats/lib/dashboard-stats-client"
import type { DashboardMatchLoggingMode } from "@/features/dashboard-stats/lib/dashboard-stats-logging-mode"
import {
  getLogMatchStepDefinition,
  getSignedSrChange,
  getVisibleLogMatchSteps,
  hasWholeNumber,
  parseOptionalInteger,
  parseRequiredInteger,
  sanitizeSrChangeInput,
  type LogMatchStep,
} from "@/features/dashboard-stats/lib/dashboard-stats-log-match-flow"
import { useLogMatchWizardStore } from "@/features/dashboard-stats/stores/log-match-wizard-store"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"

const NOTES_MAX_LENGTH = 280

type DashboardStatsLogMatchSheetProps = {
  activeSessions: DashboardState["activeSessions"]
  availableMaps: DashboardAvailableMaps
  availableModes: DashboardAvailableModes
  loggingMode: DashboardMatchLoggingMode
  onOpenChange: (open: boolean) => void
  onSessionSelected: (sessionId: string) => void
  open: boolean
  selectedSessionId: string | null
}

type ActiveSessionOption = {
  id: string
  season: number
  titleLabel: string
  usernameLabel: string | null
}

type ModeOption = {
  id: string
  key: string
  label: string
  sortOrder: number
}

type MapOption = {
  id: string
  name: string
  supportedModeIds: string[]
  supportedModes: ModeOption[]
}

type StepProgressState = "available" | "complete" | "current" | "locked"

function getSelectedModePresentation(mode: ModeOption | null) {
  if (!mode) {
    return { key: null, label: "Not set" }
  }

  return { key: mode.key.trim().toLowerCase(), label: mode.label }
}

function ChoiceCard({
  description,
  id,
  title,
  value,
}: {
  description: string
  id: string
  title: string
  value: string
}) {
  return (
    <FieldLabel
      className="cursor-pointer rounded-xl border-border/70 bg-muted/10 transition-colors hover:border-border/90"
      htmlFor={id}
    >
      <Field className="items-start gap-3 p-4" orientation="horizontal">
        <RadioGroupItem id={id} value={value} />
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  )
}

function StepProgress({
  getStepStatus,
  loggingMode,
  onStepSelect,
  steps,
}: {
  getStepStatus: (step: LogMatchStep) => StepProgressState
  loggingMode: DashboardMatchLoggingMode
  onStepSelect: (step: LogMatchStep) => void
  steps: LogMatchStep[]
}) {
  return (
    <ol className="no-scrollbar flex items-center gap-3 overflow-x-auto px-7 py-3.5">
      {steps.map((step, index) => {
        const status = getStepStatus(step)

        return (
          <li className="flex min-w-max items-center gap-3" key={step}>
            <button
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-1 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                status === "locked"
                  ? "cursor-default text-muted-foreground"
                  : "text-foreground hover:text-foreground"
              )}
              disabled={status === "locked"}
              onClick={() => onStepSelect(step)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                  status === "complete" &&
                    "border-foreground bg-foreground text-background",
                  status === "current" &&
                    "border-foreground text-foreground ring-2 ring-foreground/15",
                  status === "available" &&
                    "border-foreground/35 text-foreground",
                  status === "locked" && "border-border text-muted-foreground"
                )}
              >
                {status === "complete" ? (
                  <IconCheck aria-hidden="true" className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  status === "locked" && "text-muted-foreground"
                )}
              >
                {getLogMatchStepDefinition(step, loggingMode).label}
              </span>
            </button>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-7 bg-border/70",
                  status === "complete" && "bg-foreground/35"
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function ReviewRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

function MapCombobox({
  disabled,
  maps,
  onChange,
  value,
}: {
  disabled?: boolean
  maps: MapOption[]
  onChange: (value: string) => void
  value: string | null
}) {
  const [open, setOpen] = useState(false)
  const selectedMap = maps.find((map) => map.id === value) ?? null

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          type="button"
          variant="outline"
        >
          <span
            className={cn("truncate", !selectedMap && "text-muted-foreground")}
          >
            {selectedMap?.name ?? "Search maps…"}
          </span>
          <IconChevronDown aria-hidden="true" data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <Command>
          <CommandInput placeholder="Search maps…" />
          <CommandList>
            <CommandEmpty>No maps match the selected mode.</CommandEmpty>
            <CommandGroup>
              {maps.map((map) => (
                <CommandItem
                  key={map.id}
                  onSelect={() => {
                    onChange(map.id)
                    setOpen(false)
                  }}
                  value={map.name}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{map.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {map.supportedModes.map((mode) => mode.label).join(" · ")}
                    </span>
                  </div>
                  {selectedMap?.id === map.id ? (
                    <IconCheck aria-hidden="true" className="ml-auto" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ReviewStepPanel({
  loggingMode,
  lossProtected,
  notes,
  optionalStats,
  outcome,
  selectedMap,
  selectedMode,
  selectedSessionLabel,
  srChange,
}: {
  loggingMode: DashboardMatchLoggingMode
  lossProtected: boolean
  notes: string
  optionalStats: Array<{ label: string; value: string }>
  outcome: "loss" | "win" | null
  selectedMap: MapOption | null
  selectedMode: ModeOption | null
  selectedSessionLabel: string
  srChange: string
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        loggingMode === "basic"
          ? "max-w-2xl"
          : "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
      )}
    >
      <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
        <dl className="grid gap-4">
          <ReviewRow label="Session" value={selectedSessionLabel} />
          <ReviewRow
            label="Outcome"
            value={
              outcome === "win"
                ? "Win"
                : outcome === "loss"
                  ? "Loss"
                  : "Not set"
            }
          />
          <ReviewRow label="Mode" value={selectedMode?.label ?? "Not set"} />
          <ReviewRow label="Map" value={selectedMap?.name ?? "Not set"} />
          <ReviewRow label="SR change" value={srChange.trim() || "Not set"} />
          {loggingMode === "comprehensive" ? (
            <>
              <ReviewRow
                label="Loss protected"
                value={lossProtected ? "Yes" : "No"}
              />
              <ReviewRow
                label="Notes"
                value={notes.trim() || "No note added"}
              />
            </>
          ) : null}
        </dl>
      </div>

      {loggingMode === "comprehensive" ? (
        <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
          <div className="grid gap-1">
            <h4 className="text-sm font-semibold tracking-tight">
              Optional stats
            </h4>
            <p className="text-sm text-muted-foreground">
              Extra stats remain optional and lightweight.
            </p>
          </div>
          <Separator className="my-4" />
          {optionalStats.length > 0 || lossProtected ? (
            <dl className="grid gap-4">
              {optionalStats.map((item) => (
                <ReviewRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}
              <ReviewRow
                label="Loss protected"
                value={lossProtected ? "Yes" : "No"}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No optional stats added for this match.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function DashboardStatsLogMatchSheet({
  activeSessions,
  availableMaps,
  availableModes,
  loggingMode,
  onOpenChange,
  onSessionSelected,
  open,
  selectedSessionId,
}: DashboardStatsLogMatchSheetProps) {
  const sessions = activeSessions as ActiveSessionOption[]
  const maps = availableMaps as MapOption[]
  const modes = availableModes as ModeOption[]
  const logMatchMutation = useLogDashboardMatch()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const {
    deaths,
    defuses,
    enemyScore,
    hillTimeSeconds,
    isSubmitting,
    kills,
    lossProtected,
    mapId,
    modeId,
    notes,
    outcome,
    overloads,
    plants,
    reset,
    selectedSessionId: selectedWizardSessionId,
    setField,
    srChange,
    step,
    teamScore,
  } = useLogMatchWizardStore(
    useShallow((state) => ({
      deaths: state.deaths,
      defuses: state.defuses,
      enemyScore: state.enemyScore,
      hillTimeSeconds: state.hillTimeSeconds,
      isSubmitting: state.isSubmitting,
      kills: state.kills,
      lossProtected: state.lossProtected,
      mapId: state.mapId,
      modeId: state.modeId,
      notes: state.notes,
      outcome: state.outcome,
      overloads: state.overloads,
      plants: state.plants,
      reset: state.reset,
      selectedSessionId: state.selectedSessionId,
      setField: state.setField,
      srChange: state.srChange,
      step: state.step,
      teamScore: state.teamScore,
    }))
  )

  const requiresSessionSelection = sessions.length > 1
  const defaultSessionId =
    sessions.find((session) => session.id === selectedSessionId)?.id ??
    sessions[0]?.id ??
    null
  const resolvedSessionId = selectedWizardSessionId ?? defaultSessionId
  const visibleSteps = useMemo(
    () =>
      getVisibleLogMatchSteps({
        loggingMode,
        requiresSessionSelection,
      }),
    [loggingMode, requiresSessionSelection]
  )
  const currentStepIndex = visibleSteps.indexOf(step)
  const resolvedStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0
  const currentStep = getLogMatchStepDefinition(step, loggingMode)
  const selectedSession =
    sessions.find((session) => session.id === resolvedSessionId) ?? null
  const modesById = useMemo(
    () => new Map(modes.map((mode) => [mode.id, mode])),
    [modes]
  )
  const mapsById = useMemo(
    () => new Map(maps.map((map) => [map.id, map])),
    [maps]
  )
  const selectedMode = modeId ? (modesById.get(modeId) ?? null) : null
  const selectedMap = mapId ? (mapsById.get(mapId) ?? null) : null
  const selectedModePresentation = getSelectedModePresentation(selectedMode)
  const filteredMaps = useMemo(
    () =>
      modeId ? maps.filter((map) => map.supportedModeIds.includes(modeId)) : [],
    [maps, modeId]
  )
  const modeMapCounts = useMemo(
    () =>
      new Map(
        modes.map((mode) => [
          mode.id,
          maps.filter((map) => map.supportedModeIds.includes(mode.id)).length,
        ])
      ),
    [maps, modes]
  )
  const optionalStats = useMemo(
    () =>
      [
        kills.trim() ? { label: "Kills", value: kills.trim() } : null,
        deaths.trim() ? { label: "Deaths", value: deaths.trim() } : null,
        teamScore.trim()
          ? { label: "Team score", value: teamScore.trim() }
          : null,
        enemyScore.trim()
          ? { label: "Enemy score", value: enemyScore.trim() }
          : null,
        hillTimeSeconds.trim()
          ? { label: "Hill time", value: `${hillTimeSeconds.trim()}s` }
          : null,
        plants.trim() ? { label: "Plants", value: plants.trim() } : null,
        defuses.trim() ? { label: "Defuses", value: defuses.trim() } : null,
        overloads.trim()
          ? { label: "Overloads", value: overloads.trim() }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [
      deaths,
      defuses,
      enemyScore,
      hillTimeSeconds,
      kills,
      overloads,
      plants,
      teamScore,
    ]
  )
  const hasSelectedSession =
    !requiresSessionSelection || Boolean(resolvedSessionId)
  const hasCoreSelections =
    hasSelectedSession &&
    Boolean(outcome) &&
    hasWholeNumber(srChange) &&
    Boolean(modeId) &&
    Boolean(mapId)
  const hasOptionalStats = optionalStats.length > 0 || lossProtected
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.usernameLabel ?? "Legacy session"} · ${selectedSession.titleLabel} Season ${selectedSession.season}`
    : "Select a session to start logging."
  const selectedModeKey = selectedModePresentation.key
  const currentStepNumber = resolvedStepIndex + 1

  function updateField<TKey extends Parameters<typeof setField>[0]>(
    key: TKey,
    value: Parameters<typeof setField>[1]
  ) {
    setErrorMessage(null)
    setField(key, value as never)
  }

  const stepStatusById = useMemo(() => {
    const statuses = new Map<LogMatchStep, StepProgressState>()

    const canOpenStep = (candidate: LogMatchStep) => {
      switch (candidate) {
        case "session":
          return requiresSessionSelection
        case "outcome":
          return hasSelectedSession
        case "srChange":
          return hasSelectedSession && Boolean(outcome)
        case "mode":
          return (
            hasSelectedSession && Boolean(outcome) && hasWholeNumber(srChange)
          )
        case "map":
          return (
            hasSelectedSession &&
            Boolean(outcome) &&
            hasWholeNumber(srChange) &&
            Boolean(modeId)
          )
        case "stats":
        case "notes":
        case "review":
          return hasCoreSelections
      }
    }

    const isStepComplete = (candidate: LogMatchStep) => {
      switch (candidate) {
        case "session":
          return Boolean(resolvedSessionId)
        case "outcome":
          return Boolean(outcome)
        case "srChange":
          return hasWholeNumber(srChange)
        case "mode":
          return Boolean(modeId)
        case "map":
          return Boolean(mapId)
        case "stats":
          return hasOptionalStats
        case "notes":
          return notes.trim().length > 0
        case "review":
          return false
      }
    }

    for (const candidate of visibleSteps) {
      const canOpen = canOpenStep(candidate)

      if (!canOpen) {
        statuses.set(candidate, "locked")
        continue
      }

      if (candidate === step) {
        statuses.set(candidate, "current")
        continue
      }

      statuses.set(
        candidate,
        isStepComplete(candidate) ? "complete" : "available"
      )
    }

    return statuses
  }, [
    hasCoreSelections,
    hasOptionalStats,
    hasSelectedSession,
    mapId,
    modeId,
    notes,
    outcome,
    requiresSessionSelection,
    resolvedSessionId,
    srChange,
    step,
    visibleSteps,
  ])
  const unlockedSteps = useMemo(
    () =>
      visibleSteps.filter((candidate) => {
        const status = stepStatusById.get(candidate)
        return status !== "locked"
      }),
    [stepStatusById, visibleSteps]
  )

  function jumpToStep(nextStep: LogMatchStep) {
    if (stepStatusById.get(nextStep) === "locked") {
      return
    }

    setErrorMessage(null)
    setField("step", nextStep)
  }

  function advanceToStep(nextStep: LogMatchStep) {
    setErrorMessage(null)
    setField("step", nextStep)
  }

  const resetWizard = useEffectEvent(() => {
    reset(defaultSessionId)
    setField("step", visibleSteps[0] ?? "outcome")
    setErrorMessage(null)
  })

  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      reset(null)
      return
    }

    resetWizard()
  }, [open, reset, resetWizard])

  useEffect(() => {
    if (!visibleSteps.includes(step)) {
      setField("step", visibleSteps[0] ?? "outcome")
    }
  }, [setField, step, visibleSteps])

  useEffect(() => {
    if (!visibleSteps.includes(step) || stepStatusById.get(step) !== "locked") {
      return
    }

    const fallbackStep =
      unlockedSteps[unlockedSteps.length - 1] ?? visibleSteps[0] ?? "outcome"

    setField("step", fallbackStep)
  }, [setField, step, stepStatusById, unlockedSteps, visibleSteps])

  useEffect(() => {
    if (modeId && !modesById.has(modeId)) {
      setField("modeId", null)
      setField("mapId", null)
    }
  }, [modeId, modesById, setField])

  useEffect(() => {
    if (mapId && !filteredMaps.some((map) => map.id === mapId)) {
      setField("mapId", null)
    }
  }, [filteredMaps, mapId, setField])

  useEffect(() => {
    if (!open || !selectedWizardSessionId) {
      return
    }

    if (sessions.some((session) => session.id === selectedWizardSessionId)) {
      return
    }

    updateField("selectedSessionId", defaultSessionId)

    if (requiresSessionSelection) {
      setField("step", "session")
      setErrorMessage(
        "The previous session is no longer active. Choose another one."
      )
      return
    }

    setErrorMessage(
      "The previous session is no longer active. Logging will use the current dashboard session."
    )
  }, [
    defaultSessionId,
    open,
    requiresSessionSelection,
    selectedWizardSessionId,
    sessions,
    setField,
  ])

  function goToPreviousStep() {
    const previousStep = visibleSteps[Math.max(resolvedStepIndex - 1, 0)]
    if (previousStep) {
      advanceToStep(previousStep)
    }
  }

  function validateSessionSelection() {
    if (!resolvedSessionId) {
      throw new Error(
        sessions.length === 0
          ? "There are no active sessions available for logging."
          : "Choose the active session you want to log into."
      )
    }
  }

  function validateCurrentStep() {
    if (step === "session") {
      validateSessionSelection()
    }

    if (step !== "session") {
      validateSessionSelection()
    }

    if (step === "outcome" && !outcome) {
      throw new Error("Select whether the match was a win or a loss.")
    }

    if (step === "srChange") {
      parseRequiredInteger(srChange, "SR change")
    }

    if (step === "mode" && !modeId) {
      throw new Error("Ranked mode is required.")
    }

    if (step === "map") {
      if (!modeId) {
        throw new Error("Choose the ranked mode before selecting a map.")
      }

      if (!selectedMode) {
        throw new Error("Choose an active ranked mode for the current title.")
      }

      if (filteredMaps.length === 0) {
        throw new Error(
          `No active maps currently support ${selectedMode.label}.`
        )
      }

      if (!mapId) {
        throw new Error("Match map is required.")
      }

      if (!filteredMaps.some((map) => map.id === mapId)) {
        throw new Error(`Choose a map that supports ${selectedMode.label}.`)
      }
    }

    if (step === "stats") {
      parseOptionalInteger(kills)
      parseOptionalInteger(deaths)
      parseOptionalInteger(teamScore)
      parseOptionalInteger(enemyScore)
      parseOptionalInteger(hillTimeSeconds)
      parseOptionalInteger(plants)
      parseOptionalInteger(defuses)
      parseOptionalInteger(overloads)
    }

    if (step === "notes" && notes.trim().length > NOTES_MAX_LENGTH) {
      throw new Error(`Notes must stay within ${NOTES_MAX_LENGTH} characters.`)
    }
  }

  function handleContinue() {
    try {
      validateCurrentStep()
      const nextStep =
        visibleSteps[Math.min(resolvedStepIndex + 1, visibleSteps.length - 1)]
      if (nextStep) {
        advanceToStep(nextStep)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Check the current step and try again."
      )
    }
  }

  async function handleSubmit() {
    try {
      validateSessionSelection()
      if (!outcome) {
        throw new Error("Select whether the match was a win or a loss.")
      }

      parseRequiredInteger(srChange, "SR change")

      if (!modeId) {
        throw new Error("Ranked mode is required.")
      }

      if (!selectedMode) {
        throw new Error("Choose an active ranked mode for the current title.")
      }

      if (filteredMaps.length === 0) {
        throw new Error(
          `No active maps currently support ${selectedMode.label}.`
        )
      }

      if (!mapId || !filteredMaps.some((map) => map.id === mapId)) {
        throw new Error(`Choose a map that supports ${selectedMode.label}.`)
      }

      parseOptionalInteger(kills)
      parseOptionalInteger(deaths)
      parseOptionalInteger(teamScore)
      parseOptionalInteger(enemyScore)
      parseOptionalInteger(hillTimeSeconds)
      parseOptionalInteger(plants)
      parseOptionalInteger(defuses)
      parseOptionalInteger(overloads)

      if (notes.trim().length > NOTES_MAX_LENGTH) {
        throw new Error(
          `Notes must stay within ${NOTES_MAX_LENGTH} characters.`
        )
      }

      setErrorMessage(null)
      setField("isSubmitting", true)
      const result = await logMatchMutation.mutateAsync({
        deaths: parseOptionalInteger(deaths),
        defuses: parseOptionalInteger(defuses),
        enemyScore: parseOptionalInteger(enemyScore),
        hillTimeSeconds: parseOptionalInteger(hillTimeSeconds),
        kills: parseOptionalInteger(kills),
        lossProtected,
        mapId: mapId as Id<"rankedMaps">,
        modeId: modeId as Id<"rankedModes">,
        notes: notes.trim() ? notes.trim() : undefined,
        outcome,
        overloads: parseOptionalInteger(overloads),
        plants: parseOptionalInteger(plants),
        sessionId: resolvedSessionId as Id<"sessions">,
        srChange: getSignedSrChange(srChange, outcome),
        teamScore: parseOptionalInteger(teamScore),
      })

      onSessionSelected(result.sessionId)
      reset(result.sessionId)
      onOpenChange(false)
      toast.success("Match logged.")
    } catch (error) {
      const message =
        error instanceof DashboardStatsClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Match logging failed."
      setErrorMessage(message)
    } finally {
      setField("isSubmitting", false)
    }
  }

  const nextStep = visibleSteps[resolvedStepIndex + 1]
  const primaryActionLabel =
    step === "review"
      ? isSubmitting
        ? "Logging…"
        : "Log Match"
      : nextStep === "review"
        ? "Review"
        : "Continue"
  const isPrimaryActionDisabled =
    logMatchMutation.isPending ||
    isSubmitting ||
    sessions.length === 0 ||
    (step === "mode" && modes.length === 0) ||
    (step === "map" && Boolean(modeId) && filteredMaps.length === 0)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(88vh,54rem)] flex-col overflow-hidden overscroll-contain p-0 sm:max-w-[min(92vw,72rem)]">
        <DialogHeader className="border-b border-border/60 px-7 py-5 pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <DialogTitle>Log Ranked Match</DialogTitle>
              <DialogDescription>
                {loggingMode === "basic"
                  ? "Move through the ranked match flow without the extra stats and notes."
                  : "Work through the core result first, then add optional context before you submit the match to the current session."}
              </DialogDescription>
            </div>
            <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
              Step {currentStepNumber} of {visibleSteps.length}
            </div>
          </div>
        </DialogHeader>

        {visibleSteps.length > 1 ? (
          <div className="border-b border-border/60 bg-muted/20">
            <StepProgress
              getStepStatus={(candidate) =>
                stepStatusById.get(candidate) ?? "locked"
              }
              loggingMode={loggingMode}
              onStepSelect={jumpToStep}
              steps={visibleSteps}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-6 px-7 py-6">
            <div className="grid gap-1">
              <h3 className="text-lg font-semibold tracking-tight">
                {currentStep.title}
              </h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {currentStep.description}
              </p>
            </div>

            {errorMessage ? (
              <Alert aria-live="polite" variant="destructive">
                <AlertTitle>Fix This Step</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            {sessions.length === 0 ? (
              <Alert variant="destructive">
                <AlertTitle>No active session available</AlertTitle>
                <AlertDescription>
                  Start a current ranked session before trying to log a match.
                </AlertDescription>
              </Alert>
            ) : null}

            {step === "session" ? (
              <FieldGroup className="gap-6">
                <Field>
                  <FieldLabel htmlFor="log-match-session">
                    Active session
                  </FieldLabel>
                  <AppSelect
                    className="w-full"
                    id="log-match-session"
                    onValueChange={(value) =>
                      updateField("selectedSessionId", value)
                    }
                    options={sessions.map((session) => ({
                      label: `${session.usernameLabel ?? "Legacy session"} · ${session.titleLabel} Season ${session.season}`,
                      value: session.id,
                    }))}
                    placeholder="Select a session"
                    value={resolvedSessionId}
                  />
                  <FieldDescription>
                    Matches stay permanently tied to the session and username
                    you choose here.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            ) : null}

            {step === "outcome" ? (
              <FieldSet>
                <FieldLegend>Select outcome</FieldLegend>
                <RadioGroup
                  className="gap-3 sm:grid-cols-2"
                  onValueChange={(value) => {
                    if (value === "win" || value === "loss") {
                      updateField("outcome", value)
                    }
                  }}
                  value={outcome ?? undefined}
                >
                  <ChoiceCard
                    description="Use win when the session should record a victory and add SR normally."
                    id="match-outcome-win"
                    title="Win"
                    value="win"
                  />
                  <ChoiceCard
                    description="Use loss when the match counted as a defeat, even if loss protection applied."
                    id="match-outcome-loss"
                    title="Loss"
                    value="loss"
                  />
                </RadioGroup>
              </FieldSet>
            ) : null}

            {step === "srChange" ? (
              <FieldGroup className="max-w-md">
                <Field>
                  <FieldLabel htmlFor="match-sr-change">SR change</FieldLabel>
                  <Input
                    autoComplete="off"
                    id="match-sr-change"
                    inputMode="numeric"
                    name="match-sr-change"
                    pattern="[0-9]*"
                    onChange={(event) =>
                      updateField(
                        "srChange",
                        sanitizeSrChangeInput(event.target.value)
                      )
                    }
                    placeholder={outcome === "loss" ? "24" : "32"}
                    value={srChange}
                  />
                  <FieldDescription>
                    Enter the exact in-game SR delta as a whole number.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            ) : null}

            {step === "mode" ? (
              <FieldSet>
                <FieldLegend>Ranked mode</FieldLegend>
                <RadioGroup
                  className="gap-3 sm:grid-cols-2"
                  onValueChange={(value) => {
                    updateField("modeId", value)
                    updateField("mapId", null)
                  }}
                  value={modeId ?? undefined}
                >
                  {modes.map((mode) => {
                    const supportedMapCount = modeMapCounts.get(mode.id) ?? 0

                    return (
                      <ChoiceCard
                        description={`${supportedMapCount} active map${supportedMapCount === 1 ? "" : "s"} available for this mode.`}
                        id={`match-mode-${mode.id}`}
                        key={mode.id}
                        title={mode.label}
                        value={mode.id}
                      />
                    )
                  })}
                </RadioGroup>
                {modes.length === 0 ? (
                  <FieldDescription>
                    Staff still need to configure ranked modes for the current
                    title before matches can be logged.
                  </FieldDescription>
                ) : null}
              </FieldSet>
            ) : null}

            {step === "map" ? (
              <FieldGroup className="max-w-xl gap-4">
                <Field>
                  <FieldLabel htmlFor="match-map-combobox">Map</FieldLabel>
                  <MapCombobox
                    disabled={!modeId || filteredMaps.length === 0}
                    maps={filteredMaps}
                    onChange={(value) => updateField("mapId", value)}
                    value={mapId}
                  />
                  <FieldDescription>
                    {selectedMode
                      ? filteredMaps.length > 0
                        ? `${filteredMaps.length} map${filteredMaps.length === 1 ? "" : "s"} support ${selectedMode.label}.`
                        : `No active maps currently support ${selectedMode.label}.`
                      : "Choose the mode first to unlock the valid map list."}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            ) : null}

            {step === "stats" ? (
              <div className="grid gap-6">
                <FieldGroup className="gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="match-kills">Kills</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="match-kills"
                      inputMode="numeric"
                      name="match-kills"
                      onChange={(event) =>
                        updateField("kills", event.target.value)
                      }
                      placeholder="Optional…"
                      value={kills}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="match-deaths">Deaths</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="match-deaths"
                      inputMode="numeric"
                      name="match-deaths"
                      onChange={(event) =>
                        updateField("deaths", event.target.value)
                      }
                      placeholder="Optional…"
                      value={deaths}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="match-team-score">
                      Team score
                    </FieldLabel>
                    <Input
                      autoComplete="off"
                      id="match-team-score"
                      inputMode="numeric"
                      name="match-team-score"
                      onChange={(event) =>
                        updateField("teamScore", event.target.value)
                      }
                      placeholder="Optional…"
                      value={teamScore}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="match-enemy-score">
                      Enemy score
                    </FieldLabel>
                    <Input
                      autoComplete="off"
                      id="match-enemy-score"
                      inputMode="numeric"
                      name="match-enemy-score"
                      onChange={(event) =>
                        updateField("enemyScore", event.target.value)
                      }
                      placeholder="Optional…"
                      value={enemyScore}
                    />
                  </Field>
                </FieldGroup>

                {selectedModeKey ? <Separator /> : null}

                {selectedModeKey === "hardpoint" ? (
                  <FieldGroup className="max-w-sm">
                    <Field>
                      <FieldLabel htmlFor="match-hill-time">
                        Hill time (seconds)
                      </FieldLabel>
                      <Input
                        autoComplete="off"
                        id="match-hill-time"
                        inputMode="numeric"
                        name="match-hill-time"
                        onChange={(event) =>
                          updateField("hillTimeSeconds", event.target.value)
                        }
                        placeholder="Optional…"
                        value={hillTimeSeconds}
                      />
                    </Field>
                  </FieldGroup>
                ) : null}

                {selectedModeKey === "snd" ? (
                  <FieldGroup className="gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="match-plants">Plants</FieldLabel>
                      <Input
                        autoComplete="off"
                        id="match-plants"
                        inputMode="numeric"
                        name="match-plants"
                        onChange={(event) =>
                          updateField("plants", event.target.value)
                        }
                        placeholder="Optional…"
                        value={plants}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="match-defuses">Defuses</FieldLabel>
                      <Input
                        autoComplete="off"
                        id="match-defuses"
                        inputMode="numeric"
                        name="match-defuses"
                        onChange={(event) =>
                          updateField("defuses", event.target.value)
                        }
                        placeholder="Optional…"
                        value={defuses}
                      />
                    </Field>
                  </FieldGroup>
                ) : null}

                {selectedModeKey === "overload" ? (
                  <FieldGroup className="max-w-sm">
                    <Field>
                      <FieldLabel htmlFor="match-overloads">
                        Overloads
                      </FieldLabel>
                      <Input
                        autoComplete="off"
                        id="match-overloads"
                        inputMode="numeric"
                        name="match-overloads"
                        onChange={(event) =>
                          updateField("overloads", event.target.value)
                        }
                        placeholder="Optional…"
                        value={overloads}
                      />
                    </Field>
                  </FieldGroup>
                ) : null}

                <Field
                  className="rounded-xl border border-border/60 bg-muted/10 p-4"
                  orientation="responsive"
                >
                  <Switch
                    checked={lossProtected}
                    onCheckedChange={(checked) =>
                      updateField("lossProtected", checked)
                    }
                  />
                  <FieldContent>
                    <FieldTitle>Loss protected</FieldTitle>
                    <FieldDescription>
                      Leave this off unless the match explicitly used loss
                      protection.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </div>
            ) : null}

            {step === "notes" ? (
              <FieldGroup className="max-w-2xl">
                <Field>
                  <FieldLabel htmlFor="match-notes">Notes</FieldLabel>
                  <Textarea
                    autoComplete="off"
                    id="match-notes"
                    maxLength={NOTES_MAX_LENGTH}
                    name="match-notes"
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    placeholder="Optional short note about the match…"
                    rows={5}
                    value={notes}
                  />
                  <FieldDescription>
                    {notes.length}/{NOTES_MAX_LENGTH} characters
                  </FieldDescription>
                </Field>
              </FieldGroup>
            ) : null}

            {step === "review" ? (
              <ReviewStepPanel
                loggingMode={loggingMode}
                lossProtected={lossProtected}
                notes={notes}
                optionalStats={optionalStats}
                outcome={outcome}
                selectedMap={selectedMap}
                selectedMode={selectedMode}
                selectedSessionLabel={selectedSessionLabel}
                srChange={srChange}
              />
            ) : null}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background px-7 py-3.5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedSessionLabel}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>

              {resolvedStepIndex > 0 ? (
                <Button
                  onClick={goToPreviousStep}
                  type="button"
                  variant="outline"
                >
                  <IconChevronLeft aria-hidden="true" className="size-4" />
                  Back
                </Button>
              ) : null}

              {step === "review" ? (
                <Button
                  disabled={isPrimaryActionDisabled}
                  onClick={() => {
                    void handleSubmit()
                  }}
                  type="button"
                >
                  {primaryActionLabel}
                </Button>
              ) : (
                <Button
                  disabled={isPrimaryActionDisabled}
                  onClick={handleContinue}
                  type="button"
                >
                  {primaryActionLabel}
                  <IconChevronRight aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
