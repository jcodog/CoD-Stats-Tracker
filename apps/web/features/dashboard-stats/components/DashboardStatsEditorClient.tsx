"use client"

import { startTransition, useEffect, useState } from "react"
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
  useDashboardSessionWinLossBreakdown,
  useDashboardStatsState,
} from "@/features/dashboard-stats/lib/dashboard-stats-client"
import { DashboardStatsCharts } from "@/features/dashboard-stats/components/DashboardStatsCharts"
import { DashboardStatsCreateSessionDialog } from "@/features/dashboard-stats/components/DashboardStatsCreateSessionDialog"
import { DashboardStatsHistory } from "@/features/dashboard-stats/components/DashboardStatsHistory"
import { DashboardStatsLogMatchSheet } from "@/features/dashboard-stats/components/DashboardStatsLogMatchSheet"
import { DashboardStatsRecentMatches } from "@/features/dashboard-stats/components/DashboardStatsRecentMatches"
import { DashboardStatsSummary } from "@/features/dashboard-stats/components/DashboardStatsSummary"
import { useDashboardUiStore } from "@/features/dashboard-stats/stores/dashboard-ui-store"
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

function getPlanLabel(planKey: DashboardState["planKey"]) {
  if (planKey === "creator") {
    return "Creator"
  }

  if (planKey === "premium") {
    return "Premium"
  }

  return "Free"
}

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
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-[440px] rounded-xl" />
      <Skeleton className="h-[280px] rounded-xl" />
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

function HeroToolbarGroup({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="grid shrink-0 gap-2">
      <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
    <DashboardStatsEditorLoaded initialDashboardState={initialDashboardState} />
  )
}

function DashboardStatsEditorLoaded({
  initialDashboardState,
}: {
  initialDashboardState: DashboardState
}) {
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
    selectedSessionId,
    selectedTimeRange,
    setIncludeLossProtected,
    setSelectedSessionId,
    setSelectedTimeRange,
  } = useDashboardUiStore(
    useShallow((state) => ({
      includeLossProtected: state.includeLossProtected,
      selectedSessionId: state.selectedSessionId,
      selectedTimeRange: state.selectedTimeRange,
      setIncludeLossProtected: state.setIncludeLossProtected,
      setSelectedSessionId: state.setSelectedSessionId,
      setSelectedTimeRange: state.setSelectedTimeRange,
    }))
  )

  const dashboardStateQuery = useDashboardStatsState(initialDashboardState)
  const availableModesQuery = useDashboardAvailableModes()
  const availableMapsQuery = useDashboardAvailableMaps()
  const dashboardState = dashboardStateQuery.data
  const activeSessions = (dashboardState.activeSessions ??
    initialSessions) as typeof initialSessions
  const selectedSession =
    activeSessions.find((session) => session.id === selectedSessionId) ?? null
  const setupMessage = getSetupMessage(dashboardState)
  const activeTitleLabel =
    dashboardState.currentConfig?.activeTitleLabel ??
    selectedSession?.titleLabel ??
    null
  const activeSeason = dashboardState.currentConfig?.activeSeason ?? selectedSession?.season ?? null
  const sessionMetaLabel =
    activeTitleLabel && activeSeason !== null
      ? `${activeTitleLabel} / Season ${activeSeason}`
      : null
  const canCreateSession =
    setupMessage === null &&
    (activeSessions.length === 0 || dashboardState.planKey !== "free")
  const canLogMatches =
    setupMessage === null &&
    selectedSession !== null &&
    (availableModesQuery.data?.length ?? 0) > 0 &&
    (availableMapsQuery.data?.length ?? 0) > 0

  useEffect(() => {
    if (activeSessions.length === 0) {
      if (selectedSessionId !== null) {
        setSelectedSessionId(null)
      }

      return
    }

    if (
      !selectedSessionId ||
      !activeSessions.some((session) => session.id === selectedSessionId)
    ) {
      setSelectedSessionId(activeSessions[0]?.id ?? null)
    }
  }, [activeSessions, selectedSessionId, setSelectedSessionId])

  const overviewQuery = useDashboardSessionOverview(
    selectedSessionId,
    includeLossProtected
  )
  const srTimelineQuery = useDashboardSessionSrTimeline(
    selectedSessionId,
    includeLossProtected
  )
  const winLossBreakdownQuery = useDashboardSessionWinLossBreakdown(
    selectedSessionId,
    includeLossProtected
  )
  const dailyPerformanceQuery = useDashboardSessionDailyPerformance(
    selectedSessionId,
    includeLossProtected
  )
  const recentMatchesQuery = useDashboardRecentSessionMatches(
    selectedSessionId,
    includeLossProtected
  )

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
        <header className="flex flex-col gap-5 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">
                Ranked stats
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Create sessions for the current ranked title, log matches, and
                review SR movement without leaving the dashboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {dashboardState.currentConfig ? (
                <>
                  <span>{dashboardState.currentConfig.activeTitleLabel}</span>
                  <span aria-hidden="true">/</span>
                  <span>Season {dashboardState.currentConfig.activeSeason}</span>
                </>
              ) : (
                <span>Ranked config pending</span>
              )}
              <span aria-hidden="true">/</span>
              <span>{getPlanLabel(dashboardState.planKey)} plan</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canCreateSession ? (
              <Button
                onClick={() => setCreateSessionOpen(true)}
                variant="outline"
              >
                Create session
              </Button>
            ) : null}
            <Button
              disabled={!canLogMatches}
              onClick={() => setLogMatchOpen(true)}
            >
              Log match
            </Button>
          </div>
        </header>

        {setupMessage ? (
          <Alert>
            <AlertTitle>Ranked setup still needs staff support</AlertTitle>
            <AlertDescription>{setupMessage}</AlertDescription>
          </Alert>
        ) : null}

        {activeSessions.length === 0 ? (
          <SurfaceFrame>
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="px-6 py-6">
                <Empty className="border-none bg-transparent p-0">
                  <EmptyHeader className="items-start text-left">
                    <EmptyTitle>No active session yet</EmptyTitle>
                    <EmptyDescription>
                      {setupMessage
                        ? "The ranked setup is blocked until staff finish configuration."
                        : dashboardState.currentConfig
                          ? `Start a ${dashboardState.currentConfig.activeTitleLabel} season ${dashboardState.currentConfig.activeSeason} session to unlock logging and charts.`
                          : "Staff still need to configure the current ranked season."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
              <div className="border-t border-border/60 px-6 py-6 xl:border-t-0 xl:border-l">
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <p>
                    Free users can keep one active session for the current title
                    and season.
                  </p>
                  <p>
                    Premium and creator users can run multiple active sessions,
                    one per username.
                  </p>
                  {canCreateSession ? (
                    <div className="pt-2">
                      <Button onClick={() => setCreateSessionOpen(true)}>
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
            <SurfaceFrame>
              <div className="grid gap-0">
                <div className="px-6 py-7">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                    <div className="grid min-w-0 gap-2">
                      <h2 className="text-base font-semibold tracking-tight">
                        Session controls
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {sessionMetaLabel ?? "Switch between your active sessions here."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-start justify-start gap-x-8 gap-y-4 xl:justify-end">
                      <HeroToolbarGroup label="Session">
                        <AppSelect
                          className="w-[296px] max-w-full"
                          id="dashboard-session"
                          onValueChange={(value) =>
                            startTransition(() => setSelectedSessionId(value))
                          }
                          options={activeSessions.map((session) => ({
                            label: `${session.usernameLabel ?? "Legacy session"} | ${session.wins}-${session.losses}`,
                            value: session.id,
                          }))}
                          value={selectedSessionId ?? ""}
                        />
                      </HeroToolbarGroup>

                      <HeroToolbarGroup label="Time range">
                        <ToggleGroup
                          className="justify-start"
                          onValueChange={(value) => {
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
                          type="single"
                          value={selectedTimeRange}
                          variant="outline"
                        >
                          <ToggleGroupItem value="7d">7d</ToggleGroupItem>
                          <ToggleGroupItem value="14d">14d</ToggleGroupItem>
                          <ToggleGroupItem value="30d">30d</ToggleGroupItem>
                          <ToggleGroupItem value="all">All</ToggleGroupItem>
                        </ToggleGroup>
                      </HeroToolbarGroup>

                      <HeroToolbarGroup label="Loss protection">
                        <span className="text-sm text-muted-foreground">
                          Show
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
                      </HeroToolbarGroup>
                    </div>
                  </div>
                </div>

                {!selectedSessionId || !selectedSession ? (
                  <div className="border-t border-border/50">
                    <SurfaceSkeleton />
                  </div>
                ) : overviewQuery.isPending ||
                  srTimelineQuery.isPending ||
                  winLossBreakdownQuery.isPending ||
                  dailyPerformanceQuery.isPending ||
                  recentMatchesQuery.isPending ? (
                  <div className="border-t border-border/50">
                    <SurfaceSkeleton />
                  </div>
                ) : overviewQuery.isError ||
                  srTimelineQuery.isError ||
                  winLossBreakdownQuery.isError ||
                  dailyPerformanceQuery.isError ||
                  recentMatchesQuery.isError ? (
                  <div className="border-t border-border/50 px-6 py-6">
                    <Alert variant="destructive">
                      <AlertTitle>Session details failed to load</AlertTitle>
                      <AlertDescription>
                        Refresh the page and try again. Archived sessions remain
                        read-only and cannot accept new logs.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : overviewQuery.data &&
                  srTimelineQuery.data &&
                  winLossBreakdownQuery.data &&
                  dailyPerformanceQuery.data &&
                  recentMatchesQuery.data ? (
                  <>
                    <div className="border-t border-border/50 px-6 py-6">
                      <div className="mb-3 grid gap-1">
                        <h2 className="text-base font-semibold">
                          Session snapshot
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Core ranked metrics for the selected session,
                          recalculated against the current filters.
                        </p>
                      </div>
                      <DashboardStatsSummary
                        embedded
                        overview={overviewQuery.data}
                        showHeader={false}
                      />
                    </div>

                    <div className="border-t border-border/50 px-6 py-6">
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
                        dailyPerformance={dailyPerformanceQuery.data}
                        embedded
                        selectedTimeRange={selectedTimeRange}
                        showHeader={false}
                        srTimeline={srTimelineQuery.data}
                        winLossBreakdown={winLossBreakdownQuery.data}
                      />
                    </div>

                    <div className="grid border-t border-border/50 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
                      <div className="min-w-0 px-6 py-6">
                        <div className="mb-3 grid gap-1">
                          <h2 className="text-base font-semibold">
                            Recent matches
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Latest logs for the selected active session.
                          </p>
                        </div>
                        <DashboardStatsRecentMatches
                          embedded
                          matches={recentMatchesQuery.data}
                          showHeader={false}
                        />
                      </div>
                      <div className="min-w-0 border-t border-border/50 px-6 py-6 xl:border-t-0 xl:border-l">
                        <div className="mb-3 grid gap-1">
                          <h2 className="text-base font-semibold">
                            Session history
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Archived sessions remain visible after staff roll
                            the title or season.
                          </p>
                        </div>
                        <DashboardStatsHistory
                          archivedSessions={dashboardState.archivedSessions}
                          embedded
                          showHeader={false}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </SurfaceFrame>
          </div>
        )}

        {activeSessions.length === 0 &&
        dashboardState.archivedSessions.length > 0 ? (
          <DashboardStatsHistory
            archivedSessions={dashboardState.archivedSessions}
          />
        ) : null}
      </div>

      {dashboardState.currentConfig ? (
        <DashboardStatsCreateSessionDialog
          currentConfig={dashboardState.currentConfig}
          onOpenChange={setCreateSessionOpen}
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
        onOpenChange={setLogMatchOpen}
        onSessionSelected={(sessionId) =>
          startTransition(() => setSelectedSessionId(sessionId))
        }
        open={logMatchOpen}
        selectedSessionId={selectedSessionId}
      />
    </>
  )
}
