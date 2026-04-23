"use client"

import { IconAlertTriangle } from "@tabler/icons-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"

import { AppSelect } from "@/components/AppSelect"

function WorkspaceHeading({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

type ActiveTitleOption = {
  key: string
  label: string
}

export function StaffRankedConfigSection({
  activeTitleOptions,
  configForm,
  currentConfig,
  onActiveSeasonChange,
  onActiveTitleChange,
  onSessionWritesEnabledChange,
  onSave,
  openSessionCount,
  pending,
}: {
  activeTitleOptions: ActiveTitleOption[]
  configForm: {
    activeSeason: string
    activeTitleKey: string
    sessionWritesEnabled: boolean
  }
  currentConfig: {
    activeSeason: number
    activeTitleLabel: string
    sessionWritesEnabled: boolean
    updatedAt: number
  } | null
  onActiveSeasonChange: (value: string) => void
  onActiveTitleChange: (value: string) => void
  onSessionWritesEnabledChange: (value: boolean) => void
  onSave: () => void
  openSessionCount: number
  pending: boolean
}) {
  return (
    <section className="overflow-hidden border border-border/60 bg-background">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0">
          <WorkspaceHeading
            description="Changing the active title or season archives every open session in one backend rollover. Users do not get manual close controls in this rollout."
            title="Current ranked config"
          />
          <div className="flex flex-col gap-6 px-6 py-6">
            <Alert>
              <IconAlertTriangle />
              <AlertTitle>Rollover closes every open session</AlertTitle>
              <AlertDescription>
                Archived sessions stay visible as history, become read-only, and
                cannot accept new match logs after the title or season changes.
              </AlertDescription>
            </Alert>

            {activeTitleOptions.length === 0 ? (
              <div className="border border-dashed border-border/60 bg-muted/10 px-5 py-5 text-sm text-muted-foreground">
                An admin needs to create and activate at least one ranked title
                before staff can save the current season.
              </div>
            ) : (
              <FieldGroup>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_180px]">
                    <Field>
                      <FieldLabel htmlFor="ranked-active-title">
                        Active title
                      </FieldLabel>
                      <AppSelect
                        id="ranked-active-title"
                        onValueChange={onActiveTitleChange}
                        options={activeTitleOptions.map((title) => ({
                          label: title.label,
                          value: title.key,
                        }))}
                        placeholder="Select a title"
                        value={configForm.activeTitleKey}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="ranked-active-season">
                        Season
                      </FieldLabel>
                      <Input
                        autoComplete="off"
                        id="ranked-active-season"
                        inputMode="numeric"
                        name="ranked-active-season"
                        onChange={(event) =>
                          onActiveSeasonChange(event.target.value)
                        }
                        value={configForm.activeSeason}
                      />
                      <FieldDescription>
                        One save updates the current config and runs the
                        archival rollover.
                      </FieldDescription>
                    </Field>
                  </div>

                  <div className="border border-border/60 bg-muted/10 p-4">
                    <Field
                      className="items-start gap-3"
                      orientation="horizontal"
                    >
                      <Switch
                        checked={configForm.sessionWritesEnabled}
                        id="ranked-session-writes"
                        onCheckedChange={onSessionWritesEnabledChange}
                      />
                      <FieldContent>
                        <FieldTitle>
                          Allow session creation and match logging
                        </FieldTitle>
                        <FieldDescription>
                          Turn this off after ranked ends to freeze new sessions
                          and match logs while leaving the current title,
                          season, and history visible.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </div>
                </div>
              </FieldGroup>
            )}

            {!configForm.sessionWritesEnabled ? (
              <Alert>
                <IconAlertTriangle />
                <AlertTitle>Player writes will be paused on save</AlertTitle>
                <AlertDescription>
                  Players will still be able to review existing ranked sessions,
                  but they will not be able to create new sessions or log new
                  matches until this is turned back on.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-muted-foreground">
                Last updated{" "}
                {currentConfig
                  ? new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(currentConfig.updatedAt)
                  : "Not set"}
                .
                {openSessionCount > 0
                  ? ` Saving a changed config now archives ${openSessionCount} open session${openSessionCount === 1 ? "" : "s"}.`
                  : " No open sessions would be archived right now."}
              </div>
              <Button
                disabled={pending || activeTitleOptions.length === 0}
                onClick={onSave}
              >
                {pending ? "Saving..." : "Save current config"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="border-t border-border/60 bg-muted/10 px-6 py-6 xl:border-t-0 xl:border-l">
          <div className="grid gap-5">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">
                Current selection
              </div>
              <div className="text-lg font-semibold">
                {currentConfig
                  ? `${currentConfig.activeTitleLabel} season ${currentConfig.activeSeason}`
                  : "Not configured"}
              </div>
            </div>
            <div className="grid gap-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">
                  Open sessions in scope
                </span>
                <span className="font-medium">{openSessionCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">
                  Active titles available
                </span>
                <span className="font-medium">{activeTitleOptions.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Player writes</span>
                <span className="font-medium">
                  {currentConfig
                    ? currentConfig.sessionWritesEnabled
                      ? "Enabled"
                      : "Paused"
                    : "Not set"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
