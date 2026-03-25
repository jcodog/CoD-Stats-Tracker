"use client"

import { useEffect, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

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
import { useLogMatchWizardStore } from "@/features/dashboard-stats/stores/log-match-wizard-store"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
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

const stepLabels = {
  map: "Map",
  mode: "Mode",
  notes: "Notes",
  optionalStats: "Stats",
  outcome: "Outcome",
  review: "Review",
  session: "Session",
  srChange: "SR",
} as const

function parseRequiredInteger(value: string, fieldLabel: string) {
  const parsedValue = Number(value)

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
    return {
      key: null,
      label: "Not set",
    }
  }

  return {
    key: mode.key.trim().toLowerCase(),
    label: mode.label,
  }
}

function StepRail({
  currentStep,
}: {
  currentStep: keyof typeof stepLabels
}) {
  const orderedSteps = Object.keys(stepLabels) as Array<keyof typeof stepLabels>
  const currentIndex = orderedSteps.indexOf(currentStep)

  return (
    <div className="flex flex-wrap gap-2 border-b border-border/60 px-6 py-4">
      {orderedSteps.map((step, index) => (
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            index === currentIndex
              ? "bg-foreground text-background"
              : index < currentIndex
                ? "bg-muted text-foreground"
                : "bg-muted/50 text-muted-foreground"
          )}
          key={step}
        >
          <span className="tabular-nums">{index + 1}</span>
          <span>{stepLabels[step]}</span>
        </div>
      ))}
    </div>
  )
}

function StepSurface({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: string
  title: string
}) {
  return (
    <section className="grid gap-6 px-6 py-6">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
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
    nextStep,
    notes,
    outcome,
    overloads,
    plants,
    prevStep,
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
      nextStep: state.nextStep,
      notes: state.notes,
      outcome: state.outcome,
      overloads: state.overloads,
      plants: state.plants,
      prevStep: state.prevStep,
      reset: state.reset,
      selectedWizardSessionId: state.selectedSessionId,
      setField: state.setField,
      srChange: state.srChange,
      step: state.step,
      teamScore: state.teamScore,
    }))
  )
  const selectedSession =
    sessions.find((session) => session.id === selectedWizardSessionId) ?? null
  const selectedMode = modes.find((mode) => mode.id === modeId) ?? null
  const selectedModePresentation = getSelectedModePresentation(selectedMode)
  const filteredMaps = useMemo(
    () =>
      modeId
        ? maps.filter((map) => map.supportedModeIds.includes(modeId))
        : [],
    [maps, modeId]
  )

  useEffect(() => {
    if (!open) {
      reset(selectedSessionId)
      return
    }

    reset(selectedSessionId)
    setField("step", activeSessions.length > 1 ? "session" : "outcome")
  }, [activeSessions.length, open, reset, selectedSessionId, setField])

  useEffect(() => {
    if (!mapId) {
      return
    }

    if (!filteredMaps.some((map) => map.id === mapId)) {
      setField("mapId", null)
    }
  }, [filteredMaps, mapId, setField])

  async function handleNext() {
    try {
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

      if (step === "map" && !mapId) {
        throw new Error("Match map is required.")
      }

      if (step === "notes" && notes.trim().length > 280) {
        throw new Error("Notes must stay within 280 characters.")
      }

      nextStep()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid match details.")
    }
  }

  async function handleSubmit() {
    try {
      if (!selectedWizardSessionId) {
        throw new Error("Choose the active session you want to log into.")
      }

      if (!modeId) {
        throw new Error("Mode is required.")
      }

      if (!mapId) {
        throw new Error("Map is required.")
      }

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
      toast.error(
        error instanceof DashboardStatsClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Match logging failed."
      )
    } finally {
      setField("isSubmitting", false)
    }
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-hidden sm:max-w-2xl" side="right">
        <SheetHeader className="border-b border-border/60 px-6 pb-5">
          <SheetTitle>Log ranked match</SheetTitle>
          <SheetDescription>
            Mode is chosen before map so the dashboard only offers maps valid for
            the current title and selected ranked mode.
          </SheetDescription>
        </SheetHeader>

        <StepRail currentStep={step} />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {step === "session" ? (
            <StepSurface
              description="Premium and creator users can switch between active usernames here before logging the match."
              title="Choose the session"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="log-session">Active session</FieldLabel>
                  <AppSelect
                    id="log-session"
                    onValueChange={(value) => {
                      setField("selectedSessionId", value)
                      onSessionSelected(value)
                    }}
                    options={sessions.map((session) => ({
                      label: `${session.usernameLabel ?? "Legacy session"} | ${session.titleLabel} S${session.season}`,
                      value: session.id,
                    }))}
                    value={selectedWizardSessionId ?? ""}
                  />
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "outcome" ? (
            <StepSurface
              description="Keep this quick. Everything after mode and map stays optional."
              title="How did it go?"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel>Outcome</FieldLabel>
                  <ToggleGroup
                    onValueChange={(value) => {
                      if (value === "win" || value === "loss") {
                        setField("outcome", value)
                      }
                    }}
                    type="single"
                    value={outcome ?? ""}
                    variant="outline"
                  >
                    <ToggleGroupItem value="win">Win</ToggleGroupItem>
                    <ToggleGroupItem value="loss">Loss</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "srChange" ? (
            <StepSurface
              description="Use the exact SR delta shown in-game for this match."
              title="Record the SR movement"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="sr-change">SR change</FieldLabel>
                  <Input
                    autoComplete="off"
                    id="sr-change"
                    inputMode="numeric"
                    name="sr-change"
                    onChange={(event) => setField("srChange", event.target.value)}
                    placeholder={outcome === "loss" ? "-24" : "+32"}
                    value={srChange}
                  />
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "mode" ? (
            <StepSurface
              description="Available ranked modes come from the current title catalog and are configured by admins."
              title="Pick the ranked mode"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel>Mode</FieldLabel>
                  <ToggleGroup
                    className="flex flex-wrap justify-start"
                    onValueChange={(value) => {
                      const nextMode = modes.find((mode) => mode.id === value) ?? null
                      setField("modeId", nextMode?.id ?? null)
                      setField("mapId", null)
                    }}
                    type="single"
                    value={modeId ?? ""}
                    variant="outline"
                  >
                    {modes.map((mode) => (
                      <ToggleGroupItem key={mode.id} value={mode.id}>
                        {mode.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <FieldDescription>
                    Maps are filtered from this selection on the next step.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "map" ? (
            <StepSurface
              description="Only maps that support the selected ranked mode are available here."
              title="Choose the map"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="match-map">Map</FieldLabel>
                  <AppSelect
                    id="match-map"
                    onValueChange={(value) => setField("mapId", value)}
                    options={filteredMaps.map((map) => ({
                      label: map.name,
                      value: map.id,
                    }))}
                    placeholder="Select a map"
                    value={mapId ?? ""}
                  />
                  <FieldDescription>
                    {selectedMode
                      ? `${filteredMaps.length} map${filteredMaps.length === 1 ? "" : "s"} support ${selectedMode.label}.`
                      : "Choose a mode first."}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "optionalStats" ? (
            <StepSurface
              description="These details stay optional so you can log fast and come back only when you need the extra context."
              title="Optional stats"
            >
              <FieldGroup>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="kills">Kills</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="kills"
                      inputMode="numeric"
                      name="kills"
                      onChange={(event) => setField("kills", event.target.value)}
                      value={kills}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="deaths">Deaths</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="deaths"
                      inputMode="numeric"
                      name="deaths"
                      onChange={(event) => setField("deaths", event.target.value)}
                      value={deaths}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="team-score">Team score</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="team-score"
                      inputMode="numeric"
                      name="team-score"
                      onChange={(event) => setField("teamScore", event.target.value)}
                      value={teamScore}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="enemy-score">Enemy score</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="enemy-score"
                      inputMode="numeric"
                      name="enemy-score"
                      onChange={(event) => setField("enemyScore", event.target.value)}
                      value={enemyScore}
                    />
                  </Field>
                  {selectedModePresentation.key === "hardpoint" ? (
                    <Field>
                      <FieldLabel htmlFor="hill-time">Hill time seconds</FieldLabel>
                      <Input
                        autoComplete="off"
                        id="hill-time"
                        inputMode="numeric"
                        name="hill-time"
                        onChange={(event) =>
                          setField("hillTimeSeconds", event.target.value)
                        }
                        value={hillTimeSeconds}
                      />
                    </Field>
                  ) : null}
                  {selectedModePresentation.key === "snd" ||
                  selectedModePresentation.key === "search" ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="plants">Plants</FieldLabel>
                        <Input
                          autoComplete="off"
                          id="plants"
                          inputMode="numeric"
                          name="plants"
                          onChange={(event) => setField("plants", event.target.value)}
                          value={plants}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="defuses">Defuses</FieldLabel>
                        <Input
                          autoComplete="off"
                          id="defuses"
                          inputMode="numeric"
                          name="defuses"
                          onChange={(event) => setField("defuses", event.target.value)}
                          value={defuses}
                        />
                      </Field>
                    </>
                  ) : null}
                  {selectedModePresentation.key === "overload" ? (
                    <Field>
                      <FieldLabel htmlFor="overloads">Overloads</FieldLabel>
                      <Input
                        autoComplete="off"
                        id="overloads"
                        inputMode="numeric"
                        name="overloads"
                        onChange={(event) => setField("overloads", event.target.value)}
                        value={overloads}
                      />
                    </Field>
                  ) : null}
                </div>

                <Field>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/10 px-4 py-4">
                    <div className="grid gap-1">
                      <FieldLabel className="text-sm">Loss protected</FieldLabel>
                      <FieldDescription>
                        Leave this off unless the match explicitly used loss protection.
                      </FieldDescription>
                    </div>
                    <Switch
                      checked={lossProtected}
                      onCheckedChange={(checked) => setField("lossProtected", checked)}
                    />
                  </div>
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "notes" ? (
            <StepSurface
              description="Keep notes short and plain text. They’re meant for context, not full match recaps."
              title="Add a note if it matters"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="match-notes">Notes</FieldLabel>
                  <Textarea
                    autoComplete="off"
                    id="match-notes"
                    maxLength={280}
                    name="match-notes"
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder="Optional short note about the match."
                    rows={5}
                    value={notes}
                  />
                  <FieldDescription>{notes.length}/280 characters</FieldDescription>
                </Field>
              </FieldGroup>
            </StepSurface>
          ) : null}

          {step === "review" ? (
            <StepSurface
              description="Archived sessions remain read-only, so this final check ensures the log is correct before it updates the current session."
              title="Review the log"
            >
              <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10">
                <dl className="divide-y divide-border/60">
                  {[
                    {
                      label: "Session",
                      value: selectedSession?.usernameLabel ?? "Legacy session",
                    },
                    {
                      label: "Outcome",
                      value: outcome ?? "Not set",
                    },
                    {
                      label: "SR change",
                      value: srChange || "Not set",
                    },
                    {
                      label: "Mode",
                      value: selectedModePresentation.label,
                    },
                    {
                      label: "Map",
                      value:
                        filteredMaps.find((map) => map.id === mapId)?.name ?? "Not set",
                    },
                    {
                      label: "Loss protected",
                      value: lossProtected ? "Yes" : "No",
                    },
                  ].map((item) => (
                    <div
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                      key={item.label}
                    >
                      <dt className="text-muted-foreground">{item.label}</dt>
                      <dd className="font-medium">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {selectedMode ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedMode.label}</Badge>
                  {filteredMaps.find((map) => map.id === mapId)?.supportedModes.map(
                    (mode) => (
                      <Badge key={mode.id} variant="secondary">
                        {mode.label}
                      </Badge>
                    )
                  )}
                </div>
              ) : null}
            </StepSurface>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border/60 px-6 pt-5">
          {step !== "session" ? (
            <Button
              disabled={logMatchMutation.isPending || isSubmitting}
              onClick={prevStep}
              variant="outline"
            >
              Back
            </Button>
          ) : null}
          {step !== "review" ? (
            <Button
              disabled={
                logMatchMutation.isPending ||
                isSubmitting ||
                (step === "mode" && modes.length === 0) ||
                (step === "map" && filteredMaps.length === 0)
              }
              onClick={() => {
                void handleNext()
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              disabled={logMatchMutation.isPending || isSubmitting}
              onClick={() => {
                void handleSubmit()
              }}
            >
              {logMatchMutation.isPending ? "Saving..." : "Submit match"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
