"use client"

import dynamic from "next/dynamic"
import { startTransition, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { AppSelect } from "@/components/AppSelect"
import {
  DashboardUpgradeButton,
  DashboardUpgradePrompt,
} from "@/features/billing/components/DashboardUpgradeCta"
import type { DashboardState } from "@/features/dashboard-stats/lib/client/dashboard-state"
import {
  DashboardStatsClientError,
  useDashboardStatsState,
  useDashboardSessionAnalytics,
  useUpdateDashboardPreferredMatchLoggingMode,
} from "@/features/dashboard-stats/lib/client/dashboard-state"
import { DashboardStatsRecentMatches } from "@/features/dashboard-stats/components/recent-matches/RecentMatches"
import { DashboardStatsSummary } from "@/features/dashboard-stats/components/summary/Summary"
import { getTimeRangeStart } from "@/features/dashboard-stats/lib/formatting/numbers"
import { getVisibleLogMatchSteps } from "@/features/dashboard-stats/lib/log-match/flow"
import {
  DEFAULT_DASHBOARD_MATCH_LOGGING_MODE,
  type DashboardMatchLoggingMode,
} from "@/features/dashboard-stats/lib/log-match/mode"
import { useCreateSessionFlowStore } from "@/features/dashboard-stats/stores/create-session-flow-store"
import { useDashboardUiStore } from "@/features/dashboard-stats/stores/dashboard-ui-store"
import { useLogMatchWizardStore } from "@/features/dashboard-stats/stores/log-match-wizard-store"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Switch } from "@workspace/ui/components/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { toast } from "sonner"

const DashboardStatsCharts = dynamic(
  () =>
    import("@/features/dashboard-stats/components/charts/Charts").then(
      (module) => module.DashboardStatsCharts
    ),
  {
    loading: () => <Skeleton className="h-135 rounded-xl" />,
  }
)

const DashboardStatsCreateSessionDialog = dynamic(
  () =>
    import("@/features/dashboard-stats/components/create-session/CreateSessionDialog").then(
      (module) => module.DashboardStatsCreateSessionDialog
    ),
  {
    loading: () => null,
  }
)

const DashboardStatsLogMatchSheet = dynamic(
  () =>
    import("@/features/dashboard-stats/components/log-match/LogMatchSheet").then(
      (module) => module.DashboardStatsLogMatchSheet
    ),
  {
    loading: () => null,
  }
)

function getSetupMessage(state: DashboardState) {
  if (state.setupState.needsConfig) {
    return "Staff still need to set the current ranked title and season before sessions can be created."
  }

  if (state.setupState.needsTitle) {
    return "The current ranked title is missing from the catalog. Ask staff to repair the ranked setup."
  }

  if (state.setupState.needsModes) {
    return "The current ranked title has no active ranked modes yet. Admins need to define modes before match logging can open."
  }

  if (state.setupState.needsMaps) {
    return "The current ranked title has no active maps for its configured modes yet. Admins need to add maps before match logging can open."
  }

  return null
}

function SurfaceSkeleton() {
  return (
    <div className="grid gap-5 px-6 py-6">
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-110 rounded-lg" />
      <Skeleton className="h-70 rounded-lg" />
    </div>
  )
}

function SurfaceFrame({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-border/60 bg-background ${className}`}
    >
      {children}
    </section>
  )
}

function ToolbarGroup({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function DashboardStatsEditorClient({
  authFailed = false,
  initialDashboardState,
}: {
  authFailed?: boolean
  initialDashboardState: DashboardState | null
}) {
  if (authFailed || !initialDashboardState) {
    return (
      <section className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-2xl rounded-xl border border-border/60 bg-background px-6 py-8">
          <h1 className="text-xl font-semibold tracking-tight">
            Stats editor unavailable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not establish your dashboard session or load the current
            dashboard state for this account.
          </p>
        </div>
      </section>
    )
  }

  return (
    <DashboardStatsEditorLoaded
      initialDashboardState={initialDashboardState}
    />
  )
}

function DashboardStatsEditorLoaded({
  initialDashboardState,
}: {
  initialDashboardState: DashboardState
}) {
  const initialSessions = initialDashboardState.activeSessions
  const [createSessionOpen, setCreateSessionOpen] = useState(false)
  const [logMatchOpen, setLogMatchOpen] = useState(false)
  const {
    includeLossProtected,
    selectedLoggingMode,
    selectedSessionId,
    selectedTimeRange,
    setSelectedLoggingMode,
    setIncludeLossProtected,
    setSelectedSessionId,
    setSelectedTimeRange,
  } = useDashboardUiStore(
    useShallow((state) => ({
      includeLossProtected: state.includeLossProtected,
      selectedLoggingMode: state.selectedLoggingMode,
      selectedSessionId: state.selectedSessionId,
      selectedTimeRange: state.selectedTimeRange,
      setSelectedLoggingMode: state.setSelectedLoggingMode,
      setIncludeLossProtected: state.setIncludeLossProtected,
      setSelectedSessionId: state.setSelectedSessionId,
      setSelectedTimeRange: state.setSelectedTimeRange,
    }))
  )

  const dashboardStateQuery = useDashboardStatsState(initialDashboardState)
  const updateLoggingModeMutation =
    useUpdateDashboardPreferredMatchLoggingMode()
  const dashboardState = dashboardStateQuery.data
  const persistedLoggingMode =
    dashboardState.preferredMatchLoggingMode ??
    DEFAULT_DASHBOARD_MATCH_LOGGING_MODE
  const effectiveLoggingMode = selectedLoggingMode ?? persistedLoggingMode
  const activeSessions = dashboardState.activeSessions ?? initialSessions
  const effectiveSelectedSessionId =
    activeSessions.find((session) => session.id === selectedSessionId)?.id ??
    activeSessions[0]?.id ??
    null
  const selectedSession =
    activeSessions.find(
      (session) => session.id === effectiveSelectedSessionId
    ) ?? null
  const setupMessage = getSetupMessage(dashboardState)
  const activeTitleLabel =
    dashboardState.currentConfig?.activeTitleLabel ??
    selectedSession?.titleLabel ??
    null
  const activeSeason =
    dashboardState.currentConfig?.activeSeason ??
    selectedSession?.season ??
    null
  const sessionMetaLabel =
    activeTitleLabel && activeSeason !== null
      ? `${activeTitleLabel} / Season ${activeSeason}`
      : null
  const sessionWritesPaused =
    dashboardState.currentConfig?.sessionWritesEnabled === false
  const sessionWritesMessage = sessionWritesPaused
    ? "Staff have paused new ranked session creation and match logging for the current title and season. Existing sessions stay visible."
    : null
  const showCreateSessionButton =
    setupMessage === null &&
    (activeSessions.length === 0 || dashboardState.planKey !== "free")
  const showUpgradeCta = dashboardState.planKey === "free"
  const canCreateSession = showCreateSessionButton && !sessionWritesPaused
  const canLogMatches =
    setupMessage === null &&
    !sessionWritesPaused &&
    selectedSession !== null &&
    (dashboardState.availableModes?.length ?? 0) > 0 &&
    (dashboardState.availableMaps?.length ?? 0) > 0

  const analyticsQuery = useDashboardSessionAnalytics(
    effectiveSelectedSessionId,
    includeLossProtected
  )
  const analytics = analyticsQuery.data
  const sessionDetailsReady = analytics !== undefined
  const sessionDetailsLoading = analyticsQuery.isPending
  const filteredWinLossBreakdown = useMemo(() => {
    const timeRangeStart = getTimeRangeStart(selectedTimeRange)
    const outcomes = (analytics?.outcomes ?? []).filter(
      (match) => timeRangeStart === null || match.createdAt >= timeRangeStart
    )
    const wins = outcomes.filter((match) => match.outcome === "win").length
    const losses = outcomes.length - wins

    return {
      items: [
        { key: "wins", label: "Wins", value: wins },
        { key: "losses", label: "Losses", value: losses },
      ],
      losses,
      total: outcomes.length,
      wins,
    }
  }, [analytics?.outcomes, selectedTimeRange])
  const filteredWinRate =
    filteredWinLossBreakdown.total > 0
      ? filteredWinLossBreakdown.wins / filteredWinLossBreakdown.total
      : null
  const defaultLogMatchSessionId =
    effectiveSelectedSessionId ?? activeSessions[0]?.id ?? null

  function handleCreateSessionOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      useCreateSessionFlowStore.getState().reset()
    }

    setCreateSessionOpen(nextOpen)
  }

  function handleOpenCreateSessionDialog() {
    useCreateSessionFlowStore.getState().reset()
    setCreateSessionOpen(true)
  }

  function handleLogMatchOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      useLogMatchWizardStore.getState().reset(null)
    }

    setLogMatchOpen(nextOpen)
  }

  function handleOpenLogMatchSheet() {
    const initialStep =
      getVisibleLogMatchSteps({
        loggingMode: effectiveLoggingMode,
        requiresSessionSelection: activeSessions.length > 1,
      })[0] ?? "outcome"
    const logMatchWizardStore = useLogMatchWizardStore.getState()

    logMatchWizardStore.reset(defaultLogMatchSessionId)
    logMatchWizardStore.setField("step", initialStep)
    setLogMatchOpen(true)
  }

  function handleLoggingModeChange(value: string) {
    if (value !== "basic" && value !== "comprehensive") {
      return
    }

    if (value === effectiveLoggingMode || updateLoggingModeMutation.isPending) {
      return
    }

    const previousLoggingMode = effectiveLoggingMode
    const nextLoggingMode = value as DashboardMatchLoggingMode

    setSelectedLoggingMode(nextLoggingMode)
    void updateLoggingModeMutation.mutateAsync(nextLoggingMode).catch(() => {
      setSelectedLoggingMode(previousLoggingMode)
      toast.error(
        "Could not save your logging mode. Reverted to the last saved setting."
      )
    })
  }

  if (dashboardStateQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Dashboard stats failed to load</AlertTitle>
        <AlertDescription>
          {dashboardStateQuery.error instanceof DashboardStatsClientError
            ? dashboardStateQuery.error.message
            : "Try refreshing the page."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-8">
        <header
          className={
            "max-md:grid max-md:gap-4 max-md:border-b max-md:border-border/60 max-md:pb-5 md:flex md:flex-col md:gap-5 md:border-b md:border-border/60 md:pb-6 md:lg:flex-row md:lg:items-end md:lg:justify-between"
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h1
                className={
                  "max-md:text-3xl max-md:font-semibold max-md:tracking-tight max-md:text-balance md:text-4xl md:font-semibold md:tracking-tight md:text-balance"
                }
              >
                Ranked stats
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Create sessions for the current ranked title, log matches, and
                review SR movement without leaving the dashboard.
              </p>
            </div>
          </div>

          <div
            className={
              "max-md:grid max-md:gap-2 max-md:sm:grid-cols-2 md:flex md:flex-wrap md:items-center md:gap-2"
            }
          >
            {showUpgradeCta ? (
              <DashboardUpgradeButton
                className={
                  "max-md:h-11 max-md:w-full max-md:justify-center"
                }
              />
            ) : null}
            {showCreateSessionButton ? (
              <Button
                className={
                  "max-md:h-11 max-md:w-full max-md:justify-center"
                }
                disabled={!canCreateSession}
                onClick={handleOpenCreateSessionDialog}
                variant="outline"
              >
                Create session
              </Button>
            ) : null}
            <Button
              className={
                "max-md:h-11 max-md:w-full max-md:justify-center"
              }
              disabled={!canLogMatches}
              onClick={handleOpenLogMatchSheet}
            >
              Log match
            </Button>
          </div>
        </header>

        {setupMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Ranked setup still needs staff support</AlertTitle>
            <AlertDescription>{setupMessage}</AlertDescription>
          </Alert>
        ) : null}

        {sessionWritesMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Ranked writes are paused</AlertTitle>
            <AlertDescription>{sessionWritesMessage}</AlertDescription>
          </Alert>
        ) : null}

        {showUpgradeCta ? (
          <DashboardUpgradePrompt compact />
        ) : null}

        {activeSessions.length === 0 ? (
          <SurfaceFrame
            className={
              "max-md:overflow-visible max-md:rounded-none max-md:border-none max-md:bg-transparent"
            }
          >
            <div
              className={
                "max-md:grid max-md:gap-5 md:grid md:gap-0 md:xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
              }
            >
              <div
                className={
                  "max-md:border-y max-md:border-border/60 max-md:py-5 md:px-6 md:py-6"
                }
              >
                <Empty className="border-none bg-transparent p-0">
                  <EmptyHeader className="items-start text-left">
                    <EmptyTitle>No active session yet</EmptyTitle>
                    <EmptyDescription>
                      {setupMessage
                        ? "The ranked setup is blocked until staff finish configuration."
                        : sessionWritesPaused && dashboardState.currentConfig
                          ? `${dashboardState.currentConfig.activeTitleLabel} season ${dashboardState.currentConfig.activeSeason} is still visible, but staff have paused new session creation and match logging.`
                          : dashboardState.currentConfig
                            ? `Start a ${dashboardState.currentConfig.activeTitleLabel} season ${dashboardState.currentConfig.activeSeason} session to unlock logging and charts.`
                            : "Staff still need to configure the current ranked season."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
              <div
                className={
                  "max-md:border-y max-md:border-border/60 max-md:py-5 md:border-t md:border-border/60 md:px-6 md:py-6 md:xl:border-t-0 md:xl:border-l"
                }
              >
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Session capacity
                    </h2>
                  <p>
                    Free users can keep one active session for the current title
                    and season.
                  </p>
                  <p>
                    Premium and creator users can run multiple active sessions,
                    one per username.
                  </p>
                  {showCreateSessionButton ? (
                    <div className="pt-2">
                      <Button
                        className={
                          "max-md:h-11 max-md:w-full max-md:justify-center"
                        }
                        disabled={!canCreateSession}
                        onClick={handleOpenCreateSessionDialog}
                      >
                        Create session
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </SurfaceFrame>
        ) : (
          <div className="grid gap-6">
            <SurfaceFrame
              className={
                "max-md:overflow-visible max-md:rounded-none max-md:border-none max-md:bg-transparent"
              }
            >
              <div className="grid gap-0">
                <div
                  className={
                    "max-md:border-y max-md:border-border/60 max-md:py-5 md:px-6 md:py-7"
                  }
                >
                  <div
                    className={
                      "max-md:grid max-md:gap-5 md:grid md:gap-6 md:xl:grid-cols-[minmax(0,1fr)_auto] md:xl:items-start"
                    }
                  >
                    <div className="grid min-w-0 gap-2">
                      <h2 className="text-base font-semibold tracking-tight">
                        Session controls
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {sessionMetaLabel ??
                          "Switch between your active sessions here."}
                      </p>
                    </div>

                    <div
                      className={
                        "max-md:grid max-md:gap-3 md:grid md:gap-4 md:sm:grid-cols-2 md:xl:grid-cols-[minmax(17rem,19rem)_auto_auto_auto] md:xl:items-start"
                      }
                    >
                      <div
                        className={
                          "max-md:border-b max-md:border-border/60 max-md:pb-4"
                        }
                      >
                        <ToolbarGroup label="Session">
                          <AppSelect
                            className="w-full min-w-0"
                            id={
                              "dashboard-session"
                            }
                            onValueChange={(value) =>
                              startTransition(() => setSelectedSessionId(value))
                            }
                            options={activeSessions.map((session) => ({
                              label: `${session.usernameLabel ?? "Legacy session"} | ${session.wins}-${session.losses}`,
                              value: session.id,
                            }))}
                            value={effectiveSelectedSessionId ?? ""}
                          />
                        </ToolbarGroup>
                      </div>

                      <div
                        className={
                          "max-md:border-b max-md:border-border/60 max-md:pb-4"
                        }
                      >
                        <ToolbarGroup label="Time range">
                          <ToggleGroup
                            className={
                              "max-md:grid max-md:w-full max-md:grid-cols-4 md:justify-start"
                            }
                            onValueChange={([value]) => {
                              if (
                                value === "all" ||
                                value === "7d" ||
                                value === "14d" ||
                                value === "30d"
                              ) {
                                startTransition(() =>
                                  setSelectedTimeRange(value)
                                )
                              }
                            }}
                            size="sm"
                            value={[selectedTimeRange]}
                            variant="outline"
                          >
                            <ToggleGroupItem
                              className={"max-md:w-full"}
                              value="7d"
                            >
                              7d
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              className={"max-md:w-full"}
                              value="14d"
                            >
                              14d
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              className={"max-md:w-full"}
                              value="30d"
                            >
                              30d
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              className={"max-md:w-full"}
                              value="all"
                            >
                              All
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </ToolbarGroup>
                      </div>

                      <div
                        className={
                          "max-md:border-b max-md:border-border/60 max-md:pb-4"
                        }
                      >
                        <ToolbarGroup label="Logging mode">
                          <ToggleGroup
                            aria-label="Match logging mode"
                            className={
                              "max-md:grid max-md:w-full max-md:grid-cols-2 md:justify-start"
                            }
                            onValueChange={([value]) => {
                              if (value) handleLoggingModeChange(value)
                            }}
                            size="sm"
                            value={[effectiveLoggingMode]}
                            variant="outline"
                          >
                            <ToggleGroupItem
                              className={"max-md:w-full"}
                              disabled={updateLoggingModeMutation.isPending}
                              value="comprehensive"
                            >
                              Comprehensive
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              className={"max-md:w-full"}
                              disabled={updateLoggingModeMutation.isPending}
                              value="basic"
                            >
                              Basic
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </ToolbarGroup>
                      </div>

                      <div
                        className={
                          "max-md:flex max-md:items-center max-md:justify-between max-md:gap-4 max-md:pt-1"
                        }
                      >
                        <ToolbarGroup label="Loss protection">
                          <span className="text-sm text-muted-foreground">
                            {"Show protected losses"}
                          </span>
                          <Switch
                            aria-label="Show loss protected matches"
                            checked={includeLossProtected}
                            onCheckedChange={(checked) =>
                              startTransition(() =>
                                setIncludeLossProtected(checked)
                              )
                            }
                          />
                        </ToolbarGroup>
                      </div>
                    </div>
                  </div>
                </div>

                {!effectiveSelectedSessionId || !selectedSession ? (
                  <div
                    className={
                      "max-md:mt-6 max-md:border-t max-md:border-border/60 md:border-t md:border-border/50"
                    }
                  >
                    <SurfaceSkeleton />
                  </div>
                ) : sessionDetailsLoading ? (
                  <div
                    className={
                      "max-md:mt-6 max-md:border-t max-md:border-border/60 md:border-t md:border-border/50"
                    }
                  >
                    <SurfaceSkeleton />
                  </div>
                ) : !sessionDetailsReady ? (
                  <div
                    className={
                      "max-md:mt-6 max-md:border-t max-md:border-border/60 max-md:pt-5 md:border-t md:border-border/50 md:px-6 md:py-6"
                    }
                  >
                    <Alert variant="destructive">
                      <AlertTitle>Session details failed to load</AlertTitle>
                      <AlertDescription>
                        Refresh the page and try again. Archived sessions remain
                        read-only and cannot accept new logs.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <>
                    <div
                      className={
                        "max-md:mt-6 max-md:border-t max-md:border-border/60 max-md:pt-5 md:border-t md:border-border/50 md:px-6 md:pt-6"
                      }
                    >
                      <div className="mb-3 grid gap-1">
                        <h2 className="text-base font-semibold">
                          Session snapshot
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Start SR, Current SR, and Net SR reflect the stored
                          session. Win rate follows the active time range.
                        </p>
                      </div>
                      <DashboardStatsSummary
                        description="Start SR, Current SR, and Net SR reflect the stored session. Win rate follows the active time range."
                        embedded
                        overview={analytics!.overview}
                        showHeader={false}
                        winRate={filteredWinRate}
                      />
                    </div>

                    <div
                      className={
                        "max-md:mt-6 max-md:border-t max-md:border-border/60 max-md:pt-5 md:border-t md:border-border/50 md:px-6 md:pt-6"
                      }
                    >
                      <div className="mb-3 grid gap-1">
                        <h2 className="text-base font-semibold">
                          Session trends
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          SR movement, outcomes, and daily performance across
                          the active filter window.
                        </p>
                      </div>
                      {!analyticsQuery.historyComplete ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                          <p className="text-muted-foreground">
                            Charts show the first {analyticsQuery.historyCount}{" "}
                            matches. Load the remaining history for complete
                            chart statistics. Session totals and recent matches
                            are current.
                          </p>
                          <Button
                            variant="outline"
                            disabled={analyticsQuery.historyLoading}
                            onClick={analyticsQuery.loadMoreHistory}
                          >
                            {analyticsQuery.historyLoading
                              ? "Loading history…"
                              : "Load more history"}
                          </Button>
                        </div>
                      ) : null}
                      <DashboardStatsCharts
                        dailyPerformance={analytics!.dailyPerformance}
                        embedded
                        selectedTimeRange={selectedTimeRange}
                        showHeader={false}
                        srTimeline={analytics!.srTimeline}
                        winLossBreakdown={filteredWinLossBreakdown}
                      />
                    </div>

                    <div
                      className={
                        "max-md:mt-6 max-md:border-t max-md:border-border/60 max-md:pt-5 md:border-t md:border-border/50 md:px-6 md:py-6"
                      }
                    >
                      <div className="mb-3 grid gap-1">
                        <h2 className="text-base font-semibold">
                          Latest 50 matches
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          All logged matches for the selected session within the
                          active filter window.
                        </p>
                      </div>
                      <DashboardStatsRecentMatches
                        embedded
                        matches={analytics!.recentMatches}
                        selectedTimeRange={selectedTimeRange}
                        showHeader={false}
                      />
                    </div>
                  </>
                )}
              </div>
            </SurfaceFrame>
          </div>
        )}
      </div>

      {dashboardState.currentConfig ? (
        <DashboardStatsCreateSessionDialog
          currentConfig={dashboardState.currentConfig}
          onOpenChange={handleCreateSessionOpenChange}
          onSessionSelected={(sessionId) =>
            startTransition(() => setSelectedSessionId(sessionId))
          }
          open={createSessionOpen}
          planKey={dashboardState.planKey}
        />
      ) : null}

      <DashboardStatsLogMatchSheet
        activeSessions={activeSessions}
        availableMaps={dashboardState.availableMaps ?? []}
        availableModes={dashboardState.availableModes ?? []}
        loggingMode={effectiveLoggingMode}
        onOpenChange={handleLogMatchOpenChange}
        onSessionSelected={(sessionId) =>
          startTransition(() => setSelectedSessionId(sessionId))
        }
        open={logMatchOpen}
        selectedSessionId={effectiveSelectedSessionId}
      />
    </>
  )
}
