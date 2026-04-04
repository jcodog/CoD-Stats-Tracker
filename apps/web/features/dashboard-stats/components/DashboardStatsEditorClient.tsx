"use client"

import dynamic from "next/dynamic"
import { startTransition, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { AppSelect } from "@/components/AppSelect"
import type { DashboardState } from "@/features/dashboard-stats/lib/dashboard-stats-client"
import {
  DashboardStatsClientError,
  useDashboardAvailableMaps,
  useDashboardAvailableModes,
  useDashboardRecentSessionMatches,
  useDashboardSessionDailyPerformance,
  useDashboardSessionOverview,
  useDashboardSessionSrTimeline,
  useDashboardStatsState,
  useUpdateDashboardPreferredMatchLoggingMode,
} from "@/features/dashboard-stats/lib/dashboard-stats-client"
import { DashboardStatsRecentMatches } from "@/features/dashboard-stats/components/DashboardStatsRecentMatches"
import { DashboardStatsSummary } from "@/features/dashboard-stats/components/DashboardStatsSummary"
import { getTimeRangeStart } from "@/features/dashboard-stats/lib/dashboard-stats-format"
import { getVisibleLogMatchSteps } from "@/features/dashboard-stats/lib/dashboard-stats-log-match-flow"
import {
  DEFAULT_DASHBOARD_MATCH_LOGGING_MODE,
  type DashboardMatchLoggingMode,
} from "@/features/dashboard-stats/lib/dashboard-stats-logging-mode"
import { useCreateSessionFlowStore } from "@/features/dashboard-stats/stores/create-session-flow-store"
import { useDashboardUiStore } from "@/features/dashboard-stats/stores/dashboard-ui-store"
import { useLogMatchWizardStore } from "@/features/dashboard-stats/stores/log-match-wizard-store"
import type { RequestViewport } from "@/lib/server/request-viewport"
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
    import("@/features/dashboard-stats/components/DashboardStatsCharts").then(
      (module) => module.DashboardStatsCharts
    ),
  {
    loading: () => <Skeleton className="h-[540px] rounded-xl" />,
  }
)

const DashboardStatsCreateSessionDialog = dynamic(
  () =>
    import(
      "@/features/dashboard-stats/components/DashboardStatsCreateSessionDialog"
    ).then((module) => module.DashboardStatsCreateSessionDialog),
  {
    loading: () => null,
  }
)

const DashboardStatsLogMatchSheet = dynamic(
  () =>
    import("@/features/dashboard-stats/components/DashboardStatsLogMatchSheet").then(
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
      <Skeleton className="h-[440px] rounded-lg" />
      <Skeleton className="h-[280px] rounded-lg" />
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

type DashboardWindowedMatch = {
  createdAt: number
  outcome: "loss" | "win"
}

export function DashboardStatsEditorClient({
  authFailed = false,
  initialDashboardState,
  viewport = "desktop",
}: {
  authFailed?: boolean
  initialDashboardState: DashboardState | null
  viewport?: RequestViewport
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
      viewport={viewport}
    />
  )
}

function DashboardStatsEditorLoaded({
  initialDashboardState,
  viewport,
}: {
  initialDashboardState: DashboardState
  viewport: RequestViewport
}) {
  const isMobileView = viewport === "mobile"
  const initialSessions = initialDashboardState.activeSessions as Array<{
    id: string
    losses: number
    season: number
    titleLabel: string
    usernameLabel: string | null
    wins: number
  }>
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
  const availableModesQuery = useDashboardAvailableModes()
  const availableMapsQuery = useDashboardAvailableMaps()
  const dashboardState = dashboardStateQuery.data
  const persistedLoggingMode =
    dashboardState.preferredMatchLoggingMode ??
    DEFAULT_DASHBOARD_MATCH_LOGGING_MODE
  const effectiveLoggingMode = selectedLoggingMode ?? persistedLoggingMode
  const activeSessions = (dashboardState.activeSessions ??
    initialSessions) as typeof initialSessions
  const effectiveSelectedSessionId =
    selectedSessionId &&
    activeSessions.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : activeSessions[0]?.id ?? null
  const selectedSession =
    activeSessions.find((session) => session.id === effectiveSelectedSessionId) ??
    null
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
  const canCreateSession = showCreateSessionButton && !sessionWritesPaused
  const canLogMatches =
    setupMessage === null &&
    !sessionWritesPaused &&
    selectedSession !== null &&
    (availableModesQuery.data?.length ?? 0) > 0 &&
    (availableMapsQuery.data?.length ?? 0) > 0

  const overviewQuery = useDashboardSessionOverview(
    effectiveSelectedSessionId,
    includeLossProtected
  )
  const srTimelineQuery = useDashboardSessionSrTimeline(
    effectiveSelectedSessionId,
    includeLossProtected
  )
  const dailyPerformanceQuery = useDashboardSessionDailyPerformance(
    effectiveSelectedSessionId,
    includeLossProtected
  )
  const recentMatchesQuery = useDashboardRecentSessionMatches(
    effectiveSelectedSessionId,
    includeLossProtected
  )
  const sessionDetailsReady =
    !!overviewQuery.data &&
    !!srTimelineQuery.data &&
    !!dailyPerformanceQuery.data &&
    !!recentMatchesQuery.data
  const sessionDetailsLoading =
    !sessionDetailsReady &&
    (overviewQuery.isPending ||
      srTimelineQuery.isPending ||
      dailyPerformanceQuery.isPending ||
      recentMatchesQuery.isPending)
  const sessionDetailsRefreshError =
    sessionDetailsReady &&
    (overviewQuery.isError ||
      srTimelineQuery.isError ||
      dailyPerformanceQuery.isError ||
      recentMatchesQuery.isError)
  const sessionDetailsRefreshing =
    sessionDetailsReady &&
    (overviewQuery.isFetching ||
      srTimelineQuery.isFetching ||
      dailyPerformanceQuery.isFetching ||
      recentMatchesQuery.isFetching)
  const filteredRecentMatches = useMemo(() => {
    const recentMatches = (recentMatchesQuery.data ??
      []) as DashboardWindowedMatch[]
    const timeRangeStart = getTimeRangeStart(selectedTimeRange)

    return recentMatches.filter(
      (match: DashboardWindowedMatch) =>
        timeRangeStart === null || match.createdAt >= timeRangeStart
    )
  }, [recentMatchesQuery.data, selectedTimeRange])
  const filteredWinLossBreakdown = useMemo(() => {
    const wins = filteredRecentMatches.filter(
      (match: DashboardWindowedMatch) => match.outcome === "win"
    ).length
    const losses = filteredRecentMatches.length - wins

    return {
      items: [
        { key: "wins", label: "Wins", value: wins },
        { key: "losses", label: "Losses", value: losses },
      ],
      losses,
      total: filteredRecentMatches.length,
      wins,
    }
  }, [filteredRecentMatches])
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
            isMobileView
              ? "grid gap-4 border-b border-border/60 pb-5"
              : "flex flex-col gap-5 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between"
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h1
                className={
                  isMobileView
                    ? "text-3xl font-semibold tracking-tight text-balance"
                    : "text-4xl font-semibold tracking-tight text-balance"
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
                isMobileView
                  ? "grid gap-2 sm:grid-cols-2"
                  : "flex flex-wrap items-center gap-2"
              }
            >
            {showCreateSessionButton ? (
              <Button
                className={isMobileView ? "h-11 w-full justify-center" : undefined}
                disabled={!canCreateSession}
                onClick={handleOpenCreateSessionDialog}
                variant="outline"
              >
                Create session
              </Button>
            ) : null}
            <Button
              className={isMobileView ? "h-11 w-full justify-center" : undefined}
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

        {activeSessions.length === 0 ? (
          <SurfaceFrame
            className={
              isMobileView
                ? "overflow-visible rounded-none border-none bg-transparent"
                : undefined
            }
          >
            <div
                className={
                  isMobileView
                    ? "grid gap-5"
                    : "grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
                }
              >
                <div
                  className={
                    isMobileView
                      ? "border-y border-border/60 py-5"
                      : "px-6 py-6"
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
                    isMobileView
                      ? "border-y border-border/60 py-5"
                      : "border-t border-border/60 px-6 py-6 xl:border-t-0 xl:border-l"
                  }
                >
                  <div className="grid gap-3 text-sm text-muted-foreground">
                    {isMobileView ? <h2 className="text-base font-semibold tracking-tight text-foreground">Session capacity</h2> : null}
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
                        className={isMobileView ? "h-11 w-full justify-center" : undefined}
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
                isMobileView
                  ? "overflow-visible rounded-none border-none bg-transparent"
                  : undefined
              }
            >
              <div className="grid gap-0">
                <div
                  className={
                    isMobileView
                      ? "border-y border-border/60 py-5"
                      : "px-6 py-7"
                  }
                >
                  <div
                    className={
                      isMobileView
                        ? "grid gap-5"
                        : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start"
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
                        isMobileView
                          ? "grid gap-3"
                          : "grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(17rem,19rem)_auto_auto_auto] xl:items-start"
                      }
                    >
                      <div
                        className={
                          isMobileView
                            ? "border-b border-border/60 pb-4"
                            : undefined
                        }
                      >
                        <ToolbarGroup label="Session">
                          <AppSelect
                            className="w-full min-w-0"
                            id={isMobileView ? "dashboard-session-mobile" : "dashboard-session"}
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
                          isMobileView
                            ? "border-b border-border/60 pb-4"
                            : undefined
                        }
                      >
                        <ToolbarGroup label="Time range">
                          <ToggleGroup
                            className={
                              isMobileView
                                ? "grid w-full grid-cols-4 gap-2"
                                : "justify-start"
                            }
                            onValueChange={(value) => {
                              if (
                                value === "all" ||
                                value === "7d" ||
                                value === "14d" ||
                                value === "30d"
                              ) {
                                startTransition(() => setSelectedTimeRange(value))
                              }
                            }}
                            size="sm"
                            type="single"
                            value={selectedTimeRange}
                            variant="outline"
                          >
                            <ToggleGroupItem className={isMobileView ? "w-full" : undefined} value="7d">
                              7d
                            </ToggleGroupItem>
                            <ToggleGroupItem className={isMobileView ? "w-full" : undefined} value="14d">
                              14d
                            </ToggleGroupItem>
                            <ToggleGroupItem className={isMobileView ? "w-full" : undefined} value="30d">
                              30d
                            </ToggleGroupItem>
                            <ToggleGroupItem className={isMobileView ? "w-full" : undefined} value="all">
                              All
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </ToolbarGroup>
                      </div>

                      <div
                        className={
                          isMobileView
                            ? "border-b border-border/60 pb-4"
                            : undefined
                        }
                      >
                        <ToolbarGroup label="Logging mode">
                          <ToggleGroup
                            aria-label="Match logging mode"
                            className={
                              isMobileView
                                ? "grid w-full grid-cols-2 gap-2"
                                : "justify-start"
                            }
                            onValueChange={handleLoggingModeChange}
                            size="sm"
                            type="single"
                            value={effectiveLoggingMode}
                            variant="outline"
                          >
                            <ToggleGroupItem
                              className={isMobileView ? "w-full" : undefined}
                              disabled={updateLoggingModeMutation.isPending}
                              value="comprehensive"
                            >
                              Comprehensive
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              className={isMobileView ? "w-full" : undefined}
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
                          isMobileView
                            ? "flex items-center justify-between gap-4 pt-1"
                            : undefined
                        }
                      >
                        <ToolbarGroup label="Loss protection">
                          <span className="text-sm text-muted-foreground">
                            {isMobileView ? "Show protected losses" : "Show"}
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
                      isMobileView
                        ? "mt-6 border-t border-border/60"
                        : "border-t border-border/50"
                    }
                  >
                    <SurfaceSkeleton />
                  </div>
                ) : sessionDetailsLoading ? (
                  <div
                    className={
                      isMobileView
                        ? "mt-6 border-t border-border/60"
                        : "border-t border-border/50"
                    }
                  >
                    <SurfaceSkeleton />
                  </div>
                ) : !sessionDetailsReady ? (
                  <div
                    className={
                      isMobileView
                        ? "mt-6 border-t border-border/60 pt-5"
                        : "border-t border-border/50 px-6 py-6"
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
                    {sessionDetailsRefreshing ? (
                      <div
                        className={
                          isMobileView
                            ? "mt-5 text-sm text-muted-foreground"
                            : "border-t border-border/50 px-6 py-3 text-sm text-muted-foreground"
                        }
                      >
                        Refreshing session data…
                      </div>
                    ) : null}

                    {sessionDetailsRefreshError ? (
                      <div
                        className={
                          isMobileView
                            ? "mt-5"
                            : "border-t border-border/50 px-6 py-6"
                        }
                      >
                        <Alert variant="destructive">
                          <AlertTitle>Session refresh failed</AlertTitle>
                          <AlertDescription>
                            Showing the last available session results while the
                            latest refresh is unavailable.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : null}

                    <div
                      className={
                        isMobileView
                          ? "mt-6 border-t border-border/60 pt-5"
                          : "border-t border-border/50 px-6 pt-6"
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
                        overview={overviewQuery.data!}
                        showHeader={false}
                        viewport={isMobileView ? "mobile" : "desktop"}
                        winRate={filteredWinRate}
                      />
                    </div>

                    <div
                      className={
                        isMobileView
                          ? "mt-6 border-t border-border/60 pt-5"
                          : "border-t border-border/50 px-6 pt-6"
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
                      <DashboardStatsCharts
                        dailyPerformance={dailyPerformanceQuery.data!}
                        embedded
                        selectedTimeRange={selectedTimeRange}
                        showHeader={false}
                        srTimeline={srTimelineQuery.data!}
                        viewport={isMobileView ? "mobile" : "desktop"}
                        winLossBreakdown={filteredWinLossBreakdown}
                      />
                    </div>

                    <div
                      className={
                        isMobileView
                          ? "mt-6 border-t border-border/60 pt-5"
                          : "border-t border-border/50 px-6 py-6"
                      }
                    >
                      <div className="mb-3 grid gap-1">
                        <h2 className="text-base font-semibold">
                          Recent matches
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          All logged matches for the selected session within the
                          active filter window.
                        </p>
                      </div>
                      <DashboardStatsRecentMatches
                        embedded
                        matches={recentMatchesQuery.data!}
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
        availableMaps={availableMapsQuery.data ?? []}
        availableModes={availableModesQuery.data ?? []}
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
