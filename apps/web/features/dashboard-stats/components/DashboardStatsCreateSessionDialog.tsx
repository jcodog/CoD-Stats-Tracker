"use client"

import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import type { Id } from "@workspace/backend/convex/_generated/dataModel"
import type { DashboardState } from "@/features/dashboard-stats/lib/dashboard-stats-client"
import {
  DashboardStatsClientError,
  useCreateDashboardSession,
  useDashboardAvailableUsernames,
} from "@/features/dashboard-stats/lib/dashboard-stats-client"
import { useCreateSessionFlowStore } from "@/features/dashboard-stats/stores/create-session-flow-store"
import { AppSelect } from "@/components/AppSelect"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import { toast } from "sonner"

type DashboardStatsCreateSessionDialogProps = {
  currentConfig: DashboardState["currentConfig"]
  onOpenChange: (open: boolean) => void
  onSessionSelected: (sessionId: string) => void
  open: boolean
  planKey: DashboardState["planKey"]
}

type UsernameOption = {
  displayUsername: string
  id: string
}

function parseStartSr(value: string) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 20000) {
    throw new Error("Start SR must be a whole number between 0 and 20000.")
  }

  return parsedValue
}

export function DashboardStatsCreateSessionDialog({
  currentConfig,
  onOpenChange,
  onSessionSelected,
  open,
  planKey,
}: DashboardStatsCreateSessionDialogProps) {
  const usernamesQuery = useDashboardAvailableUsernames(open)
  const createSessionMutation = useCreateDashboardSession()
  const {
    isSubmitting,
    newUsernameInput,
    nextStep,
    prevStep,
    reset,
    selectedExistingUsernameId,
    selectionMode,
    setField,
    startSr,
    step,
  } = useCreateSessionFlowStore(
    useShallow((state) => ({
      isSubmitting: state.isSubmitting,
      newUsernameInput: state.newUsernameInput,
      nextStep: state.nextStep,
      prevStep: state.prevStep,
      reset: state.reset,
      selectedExistingUsernameId: state.selectedExistingUsernameId,
      selectionMode: state.selectionMode,
      setField: state.setField,
      startSr: state.startSr,
      step: state.step,
    }))
  )
  const usernames = (usernamesQuery.data ?? []) as UsernameOption[]

  useEffect(() => {
    if (!open) {
      reset()
      return
    }

    if (usernames.length === 0) {
      setField("selectionMode", "new")
    } else if (!selectedExistingUsernameId) {
      setField("selectedExistingUsernameId", usernames[0]?.id ?? null)
    }
  }, [open, reset, selectedExistingUsernameId, setField, usernames])

  async function handleNext() {
    if (step === "username") {
      if (selectionMode === "existing") {
        if (!selectedExistingUsernameId) {
          toast.error("Select one of your saved Activision usernames.")
          return
        }
      } else if (newUsernameInput.trim().length < 3) {
        toast.error("Enter a new Activision username with at least 3 characters.")
        return
      }

      nextStep()
      return
    }

    if (step === "startSr") {
      try {
        parseStartSr(startSr)
        nextStep()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invalid SR value.")
      }
    }
  }

  async function handleSubmit() {
    setField("isSubmitting", true)

    try {
      const createdSession = await createSessionMutation.mutateAsync({
        existingUsernameId:
          selectionMode === "existing" && selectedExistingUsernameId
            ? (selectedExistingUsernameId as Id<"activisionUsernames">)
            : undefined,
        newUsername:
          selectionMode === "new" ? newUsernameInput.trim() : undefined,
        startSr: parseStartSr(startSr),
      })

      onSessionSelected(createdSession.sessionId)
      reset()
      onOpenChange(false)
      toast.success(
        createdSession.created
          ? "Session created."
          : "Existing active session reopened instead of creating a duplicate."
      )
    } catch (error) {
      toast.error(
        error instanceof DashboardStatsClientError
          ? error.message
          : "Session creation failed."
      )
    } finally {
      setField("isSubmitting", false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create ranked session</DialogTitle>
          <DialogDescription>
            {currentConfig
              ? `${currentConfig.activeTitleLabel} season ${currentConfig.activeSeason} is the current ranked window.`
              : "Staff still need to configure the current ranked title and season."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {step === "username" ? (
            <FieldGroup>
              <Field>
                <FieldLabel>Username source</FieldLabel>
                <ToggleGroup
                  onValueChange={(value) => {
                    if (value === "existing" || value === "new") {
                      setField("selectionMode", value)
                    }
                  }}
                  type="single"
                  value={selectionMode}
                  variant="outline"
                >
                  <ToggleGroupItem disabled={usernames.length === 0} value="existing">
                    Use saved username
                  </ToggleGroupItem>
                  <ToggleGroupItem value="new">Create new username</ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>
                  The chosen Activision username is locked to this session after creation.
                </FieldDescription>
              </Field>

              {selectionMode === "existing" ? (
                <Field>
                  <FieldLabel htmlFor="existing-username">Saved username</FieldLabel>
                  <AppSelect
                    id="existing-username"
                    onValueChange={(value) =>
                      setField("selectedExistingUsernameId", value)
                    }
                    options={usernames.map((username) => ({
                      label: username.displayUsername,
                      value: username.id,
                    }))}
                    placeholder="Select a saved username"
                    value={selectedExistingUsernameId ?? ""}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="new-username">New Activision username</FieldLabel>
                  <Input
                    id="new-username"
                    onChange={(event) =>
                      setField("newUsernameInput", event.target.value)
                    }
                    placeholder="Player#1234567"
                    value={newUsernameInput}
                  />
                </Field>
              )}
            </FieldGroup>
          ) : null}

          {step === "startSr" ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="start-sr">Start SR</FieldLabel>
                <Input
                  id="start-sr"
                  inputMode="numeric"
                  onChange={(event) => setField("startSr", event.target.value)}
                  placeholder="5400"
                  value={startSr}
                />
                <FieldDescription>
                  Start SR is required and cannot be edited by users after the session is created.
                </FieldDescription>
              </Field>
            </FieldGroup>
          ) : null}

          {step === "review" ? (
            <div className="flex flex-col gap-4">
              <Alert>
                <AlertTitle>Immutable session details</AlertTitle>
                <AlertDescription>
                  Users cannot change the session username or start SR after creation.
                  Staff correction tooling is out of scope for this rollout.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
                <dl className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="font-medium">
                      {currentConfig?.activeTitleLabel ?? "Not configured"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Season</dt>
                    <dd className="font-medium">
                      {currentConfig?.activeSeason ?? "Not set"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Activision username</dt>
                    <dd className="font-medium">
                      {selectionMode === "existing"
                        ? usernames.find(
                            (username) => username.id === selectedExistingUsernameId
                          )?.displayUsername ?? "Unknown"
                        : newUsernameInput.trim()}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Start SR</dt>
                    <dd className="font-medium">{startSr}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Plan rule</dt>
                    <dd className="font-medium">
                      {planKey === "free"
                        ? "One active session for the current title and season."
                        : "Multiple active sessions allowed, one per username."}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {step !== "username" ? (
            <Button disabled={createSessionMutation.isPending || isSubmitting} onClick={prevStep} variant="outline">
              Back
            </Button>
          ) : null}
          {step !== "review" ? (
            <Button
              disabled={createSessionMutation.isPending || isSubmitting}
              onClick={() => {
                void handleNext()
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              disabled={createSessionMutation.isPending || isSubmitting}
              onClick={() => {
                void handleSubmit()
              }}
            >
              {createSessionMutation.isPending ? "Creating..." : "Create session"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
