"use client"

import { useMemo, useState } from "react"
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
  currentStep,
  loggingMode,
  onStepSelect,
  steps,
}: {
  currentStep: LogMatchStep
  loggingMode: DashboardMatchLoggingMode
  onStepSelect: (step: LogMatchStep) => void
  steps: LogMatchStep[]
}) {
  const currentStepIndex = steps.indexOf(currentStep)

  return (
    <ol
      className="grid items-start gap-x-2 gap-y-2 px-4 py-3 sm:flex sm:justify-center sm:gap-3 sm:overflow-x-auto sm:px-7 sm:py-3.5"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const status =
          index < currentStepIndex
            ? "complete"
            : index === currentStepIndex
              ? "current"
              : "upcoming"

        return (
          <li
            className="relative min-w-0 sm:flex sm:min-w-max sm:items-center sm:gap-3"
            key={step}
          >
            <button
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "flex w-full min-w-0 flex-col items-center gap-2 rounded-md px-1.5 py-1 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:flex-row sm:gap-3 sm:px-1 sm:text-left",
                status === "upcoming"
                  ? "cursor-default text-muted-foreground"
                  : "text-foreground hover:text-foreground"
              )}
              disabled={status === "upcoming"}
              onClick={() => onStepSelect(step)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums sm:size-6 sm:text-xs",
                  status === "complete" &&
                    "border-foreground bg-foreground text-background",
                  status === "current" &&
                    "border-foreground text-foreground ring-2 ring-foreground/15",
                  status === "upcoming" && "border-border text-muted-foreground"
                )}
              >
                {status === "complete" ? (
                  <IconCheck
                    aria-hidden="true"
                    className="size-3 sm:size-3.5"
                  />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "max-w-full text-center text-[11px] leading-tight font-medium text-balance sm:text-left sm:text-sm sm:whitespace-nowrap",
                  status === "upcoming" && "text-muted-foreground"
                )}
              >
                {getLogMatchStepDefinition(step, loggingMode).label}
              </span>
            </button>
            {index < steps.length - 1 ? (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3.5 right-[calc(-50%+0.95rem)] left-[calc(50%+0.95rem)] h-px bg-border/70 sm:hidden",
                    status === "complete" && "bg-foreground/35"
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden h-px w-7 bg-border/70 sm:block",
                    status === "complete" && "bg-foreground/35"
                  )}
                />
              </>
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
      <PopoverContent align="start" className="w-88 p-0">
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
  const visibleSteps = useMemo(
    () =>
      getVisibleLogMatchSteps({
        loggingMode,
        requiresSessionSelection,
      }),
    [loggingMode, requiresSessionSelection]
  )
  const initialStep = visibleSteps[0] ?? "outcome"
  const modesById = useMemo(
    () => new Map(modes.map((mode) => [mode.id, mode])),
    [modes]
  )
  const hasStaleSelectedSession = Boolean(
    selectedWizardSessionId &&
    !sessions.some((session) => session.id === selectedWizardSessionId)
  )
  const resolvedSessionId = hasStaleSelectedSession
    ? defaultSessionId
    : (selectedWizardSessionId ?? defaultSessionId)
  const resolvedStep =
    hasStaleSelectedSession && requiresSessionSelection
      ? "session"
      : visibleSteps.includes(step)
        ? step
        : initialStep
  const resolvedModeId = modeId && modesById.has(modeId) ? modeId : null
  const filteredMaps = useMemo(
    () =>
      resolvedModeId
        ? maps.filter((map) => map.supportedModeIds.includes(resolvedModeId))
        : [],
    [maps, resolvedModeId]
  )
  const mapsById = useMemo(
    () => new Map(maps.map((map) => [map.id, map])),
    [maps]
  )
  const resolvedMapId =
    mapId && filteredMaps.some((map) => map.id === mapId) ? mapId : null
  const currentStepIndex = visibleSteps.indexOf(resolvedStep)
  const resolvedStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0
  const currentStep = getLogMatchStepDefinition(resolvedStep, loggingMode)
  const selectedSession =
    sessions.find((session) => session.id === resolvedSessionId) ?? null
  const selectedMode = resolvedModeId
    ? (modesById.get(resolvedModeId) ?? null)
    : null
  const selectedMap = resolvedMapId
    ? (mapsById.get(resolvedMapId) ?? null)
    : null
  const selectedModePresentation = getSelectedModePresentation(selectedMode)
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
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.usernameLabel ?? "Legacy session"} · ${selectedSession.titleLabel} Season ${selectedSession.season}`
    : "Select a session to start logging."
  const selectedModeKey = selectedModePresentation.key
  const currentStepNumber = resolvedStepIndex + 1
  const sessionStatusMessage = hasStaleSelectedSession
    ? requiresSessionSelection
      ? "The previous session is no longer active. Choose another one."
      : "The previous session is no longer active. Logging will use the current dashboard session."
    : null

  function updateField<TKey extends Parameters<typeof setField>[0]>(
    key: TKey,
    value: Parameters<typeof setField>[1]
  ) {
    setErrorMessage(null)
    setField(key, value as never)
  }

  function jumpToStep(nextStep: LogMatchStep) {
    setErrorMessage(null)
    setField("step", nextStep)
  }

  function goToPreviousStep() {
    const previousStep = visibleSteps[Math.max(resolvedStepIndex - 1, 0)]
    if (previousStep) {
      jumpToStep(previousStep)
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
    if (resolvedStep === "session") {
      validateSessionSelection()
    }

    if (resolvedStep !== "session") {
      validateSessionSelection()
    }

    if (resolvedStep === "outcome" && !outcome) {
      throw new Error("Select whether the match was a win or a loss.")
    }

    if (resolvedStep === "srChange") {
      parseRequiredInteger(srChange, "SR change")
    }

    if (resolvedStep === "mode" && !resolvedModeId) {
      throw new Error("Ranked mode is required.")
    }

    if (resolvedStep === "map") {
      if (!resolvedModeId) {
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

      if (!resolvedMapId) {
        throw new Error("Match map is required.")
      }

      if (!filteredMaps.some((map) => map.id === resolvedMapId)) {
        throw new Error(`Choose a map that supports ${selectedMode.label}.`)
      }
    }

    if (resolvedStep === "stats") {
      parseOptionalInteger(kills)
      parseOptionalInteger(deaths)
      parseOptionalInteger(teamScore)
      parseOptionalInteger(enemyScore)
      parseOptionalInteger(hillTimeSeconds)
      parseOptionalInteger(plants)
      parseOptionalInteger(defuses)
      parseOptionalInteger(overloads)
    }

    if (resolvedStep === "notes" && notes.trim().length > NOTES_MAX_LENGTH) {
      throw new Error(`Notes must stay within ${NOTES_MAX_LENGTH} characters.`)
    }
  }

  function handleContinue() {
    try {
      validateCurrentStep()
      const nextStep =
        visibleSteps[Math.min(resolvedStepIndex + 1, visibleSteps.length - 1)]
      if (nextStep) {
        jumpToStep(nextStep)
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

      if (!resolvedModeId) {
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

      if (
        !resolvedMapId ||
        !filteredMaps.some((map) => map.id === resolvedMapId)
      ) {
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
        mapId: resolvedMapId as Id<"rankedMaps">,
        modeId: resolvedModeId as Id<"rankedModes">,
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
    resolvedStep === "review"
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
    (resolvedStep === "mode" && modes.length === 0) ||
    (resolvedStep === "map" &&
      Boolean(resolvedModeId) &&
      filteredMaps.length === 0)

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
              currentStep={resolvedStep}
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

            {(errorMessage ?? sessionStatusMessage) ? (
              <Alert aria-live="polite" variant="destructive">
                <AlertTitle>Fix This Step</AlertTitle>
                <AlertDescription>
                  {errorMessage ?? sessionStatusMessage}
                </AlertDescription>
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

            {resolvedStep === "session" ? (
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

            {resolvedStep === "outcome" ? (
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

            {resolvedStep === "srChange" ? (
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

            {resolvedStep === "mode" ? (
              <FieldSet>
                <FieldLegend>Ranked mode</FieldLegend>
                <RadioGroup
                  className="gap-3 sm:grid-cols-2"
                  onValueChange={(value) => {
                    updateField("modeId", value)
                    updateField("mapId", null)
                  }}
                  value={resolvedModeId ?? undefined}
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

            {resolvedStep === "map" ? (
              <FieldGroup className="max-w-xl gap-4">
                <Field>
                  <FieldLabel htmlFor="match-map-combobox">Map</FieldLabel>
                  <MapCombobox
                    disabled={!resolvedModeId || filteredMaps.length === 0}
                    maps={filteredMaps}
                    onChange={(value) => updateField("mapId", value)}
                    value={resolvedMapId}
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

            {resolvedStep === "stats" ? (
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

            {resolvedStep === "notes" ? (
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

            {resolvedStep === "review" ? (
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

              {resolvedStep === "review" ? (
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
