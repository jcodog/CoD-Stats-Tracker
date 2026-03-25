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
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
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
  "srChange",
  "mode",
  "map",
  "stats",
  "notes",
  "review",
]

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
  checked,
  description,
  id,
  onSelect,
  title,
  value,
}: {
  checked: boolean
  description: string
  id: string
  onSelect: (value: string) => void
  title: string
  value: string
}) {
  return (
    <FieldLabel className="rounded-lg">
      <Field>
        <RadioGroupItem
          checked={checked}
          id={id}
          onClick={() => onSelect(value)}
          value={value}
        />
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
  onStepSelect,
  steps,
}: {
  currentStep: LogMatchStep
  onStepSelect: (step: LogMatchStep) => void
  steps: LogMatchStep[]
}) {
  const currentStepIndex = steps.indexOf(currentStep)

  return (
    <ol className="no-scrollbar flex items-center gap-3 overflow-x-auto px-6 py-4">
      {steps.map((step, index) => {
        const status =
          index < currentStepIndex
            ? "complete"
            : index === currentStepIndex
              ? "current"
              : "upcoming"

        return (
          <li className="flex min-w-max items-center gap-3" key={step}>
            <button
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-1 py-1 text-left transition-colors",
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
                  "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                  status === "complete" &&
                    "border-foreground bg-foreground text-background",
                  status === "current" &&
                    "border-foreground text-foreground ring-2 ring-foreground/15",
                  status === "upcoming" &&
                    "border-border text-muted-foreground"
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
                  status === "upcoming" && "text-muted-foreground"
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
          <span className={cn("truncate", !selectedMap && "text-muted-foreground")}>
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

export function DashboardStatsLogMatchSheet(
  {
    activeSessions,
    availableMaps,
    availableModes,
    onOpenChange,
    onSessionSelected,
    open,
    selectedSessionId,
  }: DashboardStatsLogMatchSheetProps
) {
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
  const selectedMode = modeId ? modesById.get(modeId) ?? null : null
  const selectedMap = mapId ? mapsById.get(mapId) ?? null : null
  const selectedModePresentation = getSelectedModePresentation(selectedMode)
  const filteredMaps = useMemo(
    () =>
      modeId
        ? maps.filter((map) => map.supportedModeIds.includes(modeId))
        : [],
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
        teamScore.trim() ? { label: "Team score", value: teamScore.trim() } : null,
        enemyScore.trim()
          ? { label: "Enemy score", value: enemyScore.trim() }
          : null,
        hillTimeSeconds.trim()
          ? { label: "Hill time", value: `${hillTimeSeconds.trim()}s` }
          : null,
        plants.trim() ? { label: "Plants", value: plants.trim() } : null,
        defuses.trim() ? { label: "Defuses", value: defuses.trim() } : null,
        overloads.trim() ? { label: "Overloads", value: overloads.trim() } : null,
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

  function updateField<
    TKey extends Parameters<typeof setField>[0],
  >(key: TKey, value: Parameters<typeof setField>[1]) {
    setErrorMessage(null)
    setField(key, value as never)
  }

  function setWizardStep(nextStep: LogMatchStep) {
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
  }, [
    hasMultipleSessions,
    open,
    reset,
    selectedSessionId,
    sessions,
    setField,
  ])

  useEffect(() => {
    if (!visibleSteps.includes(step)) {
      setField("step", visibleSteps[0] ?? "outcome")
    }
  }, [setField, step, visibleSteps])

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
        error instanceof Error ? error.message : "Check the current step and try again."
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100vh-2.5rem)] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <DialogTitle>Log Ranked Match</DialogTitle>
              <DialogDescription>
                Work through the core result first, then add optional context
                before you submit the match to the current session.
              </DialogDescription>
            </div>
            <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
              Step {currentStepIndex + 1} of {visibleSteps.length}
            </div>
          </div>
        </DialogHeader>

        <div className="border-b border-border/60 bg-muted/20">
          <StepProgress
            currentStep={step}
            onStepSelect={setWizardStep}
            steps={visibleSteps}
          />
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-6">
          <div className="grid gap-6">
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
}
