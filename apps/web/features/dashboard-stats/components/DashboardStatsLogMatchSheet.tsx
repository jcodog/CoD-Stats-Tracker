"use client"

import { useEffect, useMemo, useState } from "react"
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
import {
  type LogMatchStep,
  useLogMatchWizardStore,
} from "@/features/dashboard-stats/stores/log-match-wizard-store"
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

type DashboardStatsLogMatchSheetProps = {
  activeSessions: DashboardState["activeSessions"]
  availableMaps: DashboardAvailableMaps
  availableModes: DashboardAvailableModes
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

type StepDefinition = {
  description: string
  label: string
  title: string
}

type StepProgressState = "available" | "complete" | "current" | "locked"

const stepDefinitions: Record<LogMatchStep, StepDefinition> = {
  map: {
    description:
      "Search only the maps that support the selected ranked mode for the current title.",
    label: "Map",
    title: "Choose The Map",
  },
  mode: {
    description:
      "Ranked mode is required and determines which maps are valid on the next step.",
    label: "Mode",
    title: "Pick The Ranked Mode",
  },
  notes: {
    description:
      "Keep notes short and plain text. They are only for match context.",
    label: "Notes",
    title: "Add Notes If They Matter",
  },
  outcome: {
    description:
      "Start with the match result so the rest of the log stays fast and predictable.",
    label: "Outcome",
    title: "Record The Match Result",
  },
  review: {
    description:
      "Check the captured values before the match updates the active session.",
    label: "Review",
    title: "Review & Submit",
  },
  session: {
    description:
      "Choose which active session this match belongs to before entering the result.",
    label: "Session",
    title: "Choose The Session",
  },
  srChange: {
    description:
      "Use the exact SR delta shown in game. Enter a whole number with the sign if needed.",
    label: "SR",
    title: "Record The SR Change",
  },
  stats: {
    description:
      "Optional stats stay lightweight so you can log fast and only add extra context when you need it.",
    label: "Stats",
    title: "Add Optional Stats",
  },
}

const fullStepOrder: LogMatchStep[] = [
  "session",
  "outcome",
  "mode",
  "map",
  "stats",
  "srChange",
  "notes",
  "review",
]

function hasWholeNumber(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue ? Number.isInteger(Number(trimmedValue)) : false
}

function parseRequiredInteger(value: string, fieldLabel: string) {
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

function parseOptionalInteger(value: string) {
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

function getSelectedModePresentation(mode: ModeOption | null) {
  if (!mode) {
    return { key: null, label: "Not set" }
  }

  return { key: mode.key.trim().toLowerCase(), label: mode.label }
}

function getVisibleStepOrder(hasMultipleSessions: boolean) {
  return hasMultipleSessions
    ? fullStepOrder
    : fullStepOrder.filter((step) => step !== "session")
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
  onStepSelect,
  steps,
}: {
  getStepStatus: (step: LogMatchStep) => StepProgressState
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
                {stepDefinitions[step].label}
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

export function DashboardStatsLogMatchSheet({
  activeSessions,
  availableMaps,
  availableModes,
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
    selectedWizardSessionId,
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
      selectedWizardSessionId: state.selectedSessionId,
      setField: state.setField,
      srChange: state.srChange,
      step: state.step,
      teamScore: state.teamScore,
    }))
  )

  const hasMultipleSessions = sessions.length > 1
  const visibleSteps = useMemo(
    () => getVisibleStepOrder(hasMultipleSessions),
    [hasMultipleSessions]
  )
  const currentStepIndex = visibleSteps.indexOf(step)
  const currentStep = stepDefinitions[step]
  const selectedSession =
    sessions.find((session) => session.id === selectedWizardSessionId) ?? null
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
    !hasMultipleSessions || Boolean(selectedWizardSessionId)
  const hasCoreSelections =
    hasSelectedSession && Boolean(outcome) && Boolean(modeId) && Boolean(mapId)
  const hasOptionalStats = optionalStats.length > 0 || lossProtected
  const stepStatusById = useMemo(() => {
    const statuses = new Map<LogMatchStep, StepProgressState>()

    const canOpenStep = (candidate: LogMatchStep) => {
      switch (candidate) {
        case "session":
          return hasMultipleSessions
        case "outcome":
          return hasSelectedSession
        case "mode":
          return hasSelectedSession && Boolean(outcome)
        case "map":
          return hasSelectedSession && Boolean(outcome) && Boolean(modeId)
        case "stats":
        case "srChange":
        case "notes":
        case "review":
          return hasCoreSelections
      }
    }

    const isStepComplete = (candidate: LogMatchStep) => {
      switch (candidate) {
        case "session":
          return Boolean(selectedWizardSessionId)
        case "outcome":
          return Boolean(outcome)
        case "mode":
          return Boolean(modeId)
        case "map":
          return Boolean(mapId)
        case "stats":
          return hasOptionalStats
        case "srChange":
          return hasWholeNumber(srChange)
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
    hasMultipleSessions,
    hasOptionalStats,
    hasSelectedSession,
    mapId,
    modeId,
    notes,
    outcome,
    selectedWizardSessionId,
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

  function updateField<TKey extends Parameters<typeof setField>[0]>(
    key: TKey,
    value: Parameters<typeof setField>[1]
  ) {
    setErrorMessage(null)
    setField(key, value as never)
  }

  function setWizardStep(nextStep: LogMatchStep) {
    if (stepStatusById.get(nextStep) === "locked") {
      return
    }

    setErrorMessage(null)
    setField("step", nextStep)
  }

  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      reset(null)
      return
    }

    const initialSessionId =
      sessions.find((session) => session.id === selectedSessionId)?.id ??
      sessions[0]?.id ??
      null

    reset(initialSessionId)
    setField("step", hasMultipleSessions ? "session" : "outcome")
    setErrorMessage(null)
  }, [hasMultipleSessions, open, reset, selectedSessionId, sessions, setField])

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
    if (mapId && !filteredMaps.some((map) => map.id === mapId)) {
      setField("mapId", null)
    }
  }, [filteredMaps, mapId, setField])

  function goToPreviousStep() {
    const previousStep = visibleSteps[Math.max(currentStepIndex - 1, 0)]
    if (previousStep) {
      setWizardStep(previousStep)
    }
  }

  function goToNextStep() {
    const nextStep =
      visibleSteps[Math.min(currentStepIndex + 1, visibleSteps.length - 1)]
    if (nextStep) {
      setWizardStep(nextStep)
    }
  }

  function validateCurrentStep() {
    if (step === "session" && !selectedWizardSessionId) {
      throw new Error("Choose the active session you want to log into.")
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
      if (!mapId) {
        throw new Error("Match map is required.")
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

    if (step === "notes" && notes.trim().length > 280) {
      throw new Error("Notes must stay within 280 characters.")
    }
  }

  function handleContinue() {
    try {
      validateCurrentStep()
      goToNextStep()
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
      validateCurrentStep()
      if (!selectedWizardSessionId) {
        throw new Error("Choose the active session you want to log into.")
      }
      if (!modeId) {
        throw new Error("Mode is required.")
      }
      if (!mapId) {
        throw new Error("Map is required.")
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
        outcome: outcome ?? "loss",
        overloads: parseOptionalInteger(overloads),
        plants: parseOptionalInteger(plants),
        sessionId: selectedWizardSessionId as Id<"sessions">,
        srChange: parseRequiredInteger(srChange, "SR change"),
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

  const primaryActionLabel =
    step === "review"
      ? isSubmitting
        ? "Logging…"
        : "Log Match"
      : step === "notes"
        ? "Review"
        : "Continue"
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.usernameLabel ?? "Legacy session"} · ${selectedSession.titleLabel} Season ${selectedSession.season}`
    : "Select a session to start logging."
  const selectedModeKey = selectedModePresentation.key
  const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1
  const isPrimaryActionDisabled =
    logMatchMutation.isPending ||
    isSubmitting ||
    (step === "mode" && modes.length === 0) ||
    (step === "map" && filteredMaps.length === 0)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(88vh,54rem)] flex-col overflow-hidden p-0 sm:max-w-[min(92vw,72rem)]">
        <DialogHeader className="border-b border-border/60 px-7 py-5 pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <DialogTitle>Log Ranked Match</DialogTitle>
              <DialogDescription>
                Work through the core result first, then add optional context
                before you submit the match to the current session.
              </DialogDescription>
            </div>
            <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
              Step {currentStepNumber} of {visibleSteps.length}
            </div>
          </div>
        </DialogHeader>

        <div className="border-b border-border/60 bg-muted/20">
          <StepProgress
            getStepStatus={(candidate) =>
              stepStatusById.get(candidate) ?? "locked"
            }
            onStepSelect={setWizardStep}
            steps={visibleSteps}
          />
        </div>

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
                    value={selectedWizardSessionId}
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
                    onChange={(event) =>
                      updateField("srChange", event.target.value)
                    }
                    placeholder={outcome === "loss" ? "-24" : "+32"}
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
                      onChange={(event) =>
                        updateField("kills", event.target.value)
                      }
                      placeholder="Optional"
                      value={kills}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="match-deaths">Deaths</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="match-deaths"
                      inputMode="numeric"
                      onChange={(event) =>
                        updateField("deaths", event.target.value)
                      }
                      placeholder="Optional"
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
                      onChange={(event) =>
                        updateField("teamScore", event.target.value)
                      }
                      placeholder="Optional"
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
                      onChange={(event) =>
                        updateField("enemyScore", event.target.value)
                      }
                      placeholder="Optional"
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
                        onChange={(event) =>
                          updateField("hillTimeSeconds", event.target.value)
                        }
                        placeholder="Optional"
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
                        onChange={(event) =>
                          updateField("plants", event.target.value)
                        }
                        placeholder="Optional"
                        value={plants}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="match-defuses">Defuses</FieldLabel>
                      <Input
                        autoComplete="off"
                        id="match-defuses"
                        inputMode="numeric"
                        onChange={(event) =>
                          updateField("defuses", event.target.value)
                        }
                        placeholder="Optional"
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
                        onChange={(event) =>
                          updateField("overloads", event.target.value)
                        }
                        placeholder="Optional"
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
                    maxLength={280}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    placeholder="Optional short note about the match."
                    rows={5}
                    value={notes}
                  />
                  <FieldDescription>
                    {notes.length}/280 characters
                  </FieldDescription>
                </Field>
              </FieldGroup>
            ) : null}

            {step === "review" ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
                    <ReviewRow
                      label="Mode"
                      value={selectedMode?.label ?? "Not set"}
                    />
                    <ReviewRow
                      label="Map"
                      value={selectedMap?.name ?? "Not set"}
                    />
                    <ReviewRow
                      label="Loss protected"
                      value={lossProtected ? "Yes" : "No"}
                    />
                    <ReviewRow
                      label="SR change"
                      value={srChange.trim() || "Not set"}
                    />
                    <ReviewRow
                      label="Notes"
                      value={notes.trim() || "No note added"}
                    />
                  </dl>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
                  <div className="grid gap-1">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Optional stats
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Extra stats are optional and stay lightweight by design.
                    </p>
                  </div>
                  <Separator className="my-4" />
                  {optionalStats.length > 0 ? (
                    <dl className="grid gap-4">
                      {optionalStats.map((item) => (
                        <ReviewRow
                          key={item.label}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No optional stats added for this match.
                    </p>
                  )}
                </div>
              </div>
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

              {currentStepIndex > 0 ? (
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
