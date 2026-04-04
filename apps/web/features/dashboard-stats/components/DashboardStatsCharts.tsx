"use client"

import { memo, useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import type {
  DashboardSessionDailyPerformance,
  DashboardSessionSrTimeline,
  DashboardSessionWinLossBreakdown,
} from "@/features/dashboard-stats/lib/dashboard-stats-client"
import {
  formatDashboardDay,
  getTimeRangeStart,
} from "@/features/dashboard-stats/lib/dashboard-stats-format"
import {
  DASHBOARD_NEGATIVE_COLOR,
  DASHBOARD_POSITIVE_COLOR,
  getDashboardMetricColor,
} from "@/features/dashboard-stats/lib/dashboard-stats-visuals"
import type { DashboardTimeRange } from "@/features/dashboard-stats/stores/dashboard-ui-store"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"

const srChartConfig = {
  sr: {
    label: "SR",
  },
} satisfies ChartConfig

const winLossChartConfig = {
  losses: {
    color: DASHBOARD_NEGATIVE_COLOR,
    label: "Losses",
  },
  wins: {
    color: DASHBOARD_POSITIVE_COLOR,
    label: "Wins",
  },
} satisfies ChartConfig

const dailySrChartConfig = {
  netSr: {
    label: "Net SR",
  },
} satisfies ChartConfig

function getExactAxisDomain(values: number[], fallback: readonly [number, number]) {
  if (values.length === 0) {
    return fallback
  }

  return [Math.min(...values), Math.max(...values)] as const
}

function getExactAxisTicks(args: {
  includeZero?: boolean
  maxTickCount?: number
  values: number[]
}) {
  const values = args.values.filter((value) => Number.isFinite(value))

  if (values.length === 0) {
    return [] as number[]
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  if (minValue === maxValue) {
    return [minValue]
  }

  const ticks = new Set<number>([minValue, maxValue])

  if (args.includeZero && minValue < 0 && maxValue > 0) {
    ticks.add(0)
  }

  const remainingSlots = Math.max((args.maxTickCount ?? 4) - ticks.size, 0)

  if (remainingSlots > 0) {
    const step = (maxValue - minValue) / (remainingSlots + 1)

    for (let index = 1; index <= remainingSlots; index += 1) {
      const nextTick = Math.round(minValue + step * index)

      if (nextTick > minValue && nextTick < maxValue) {
        ticks.add(nextTick)
      }
    }
  }

  return Array.from(ticks).sort((left, right) => left - right)
}

function getSrAxisDomain(points: Array<{ sr: number }>) {
  return getExactAxisDomain(
    points.map((point) => point.sr),
    [0, 100]
  )
}

function getDailySrAxisDomain(points: Array<{ netSr: number }>) {
  if (points.length === 0) {
    return [-100, 100] as const
  }

  const values = points.map((point) => point.netSr)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  if (minValue === 0 && maxValue === 0) {
    return [-1, 1] as const
  }

  if (minValue >= 0) {
    return [0, maxValue] as const
  }

  if (maxValue <= 0) {
    return [minValue, 0] as const
  }

  return [minValue, maxValue] as const
}

function ChartPanel({
  children,
  description,
  title,
  viewport = "desktop",
}: {
  children: React.ReactNode
  description: string
  title: string
  viewport?: "desktop" | "mobile"
}) {
  const isMobileView = viewport === "mobile"

  return (
    <div
      className={cn(
        "bg-background",
        isMobileView
          ? "border-t border-border/60 pt-5 first:border-t-0"
          : "px-6 py-6"
      )}
    >
      <div className="mb-4 grid gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ChartEmptyState({
  description,
  title,
  viewport = "desktop",
}: {
  description: string
  title: string
  viewport?: "desktop" | "mobile"
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-border/50 bg-background px-6 text-center",
        viewport === "mobile" ? "min-h-55" : "min-h-65"
      )}
    >
      <div className="font-medium">{title}</div>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export const DashboardStatsCharts = memo(function DashboardStatsCharts({
  className,
  dailyPerformance,
  embedded = false,
  selectedTimeRange,
  showHeader = true,
  srTimeline,
  viewport = "desktop",
  winLossBreakdown,
}: {
  className?: string
  dailyPerformance: DashboardSessionDailyPerformance
  embedded?: boolean
  selectedTimeRange: DashboardTimeRange
  showHeader?: boolean
  srTimeline: DashboardSessionSrTimeline
  viewport?: "desktop" | "mobile"
  winLossBreakdown: DashboardSessionWinLossBreakdown
}) {
  const isMobileView = viewport === "mobile"
  const timelinePoints = srTimeline.points as Array<{
    createdAt: number
    matchNumber: number
    sr: number
    srChange: number
  }>
  const dailyPoints = dailyPerformance.days as Array<{
    dateKey: string
    losses: number
    netSr: number
    wins: number
  }>
  const winLossItems = winLossBreakdown.items as Array<{
    key: string
    label: string
    value: number
  }>
  const timeRangeStart = getTimeRangeStart(selectedTimeRange)
  const filteredTimeline = useMemo(
    () =>
      timelinePoints.filter(
        (point) => timeRangeStart === null || point.createdAt >= timeRangeStart
      ),
    [timelinePoints, timeRangeStart]
  )
  const srAxisDomain = useMemo(
    () => getSrAxisDomain(filteredTimeline),
    [filteredTimeline]
  )
  const srAxisTicks = useMemo(
    () => getExactAxisTicks({ values: filteredTimeline.map((point) => point.sr) }),
    [filteredTimeline]
  )
  const filteredDaily = useMemo(
    () =>
      dailyPoints.filter((day) => {
        if (timeRangeStart === null) {
          return true
        }

        return (
          new Date(`${day.dateKey}T00:00:00.000Z`).getTime() >= timeRangeStart
        )
      }),
    [dailyPoints, timeRangeStart]
  )
  const dailyWinLossData = useMemo(
    () =>
      filteredDaily.map((day) => ({
        dateKey: formatDashboardDay(day.dateKey),
        losses: day.losses,
        wins: day.wins,
      })),
    [filteredDaily]
  )
  const dailySrData = useMemo(
    () =>
      filteredDaily.map((day) => ({
        dateKey: formatDashboardDay(day.dateKey),
        netSr: day.netSr,
      })),
    [filteredDaily]
  )
  const dailySrAxisDomain = useMemo(
    () => getDailySrAxisDomain(dailySrData),
    [dailySrData]
  )
  const dailySrAxisTicks = useMemo(
    () =>
      getExactAxisTicks({
        includeZero: true,
        values: [...dailySrData.map((day) => day.netSr), 0],
      }),
    [dailySrData]
  )
  const srSegments = useMemo(
    () =>
      filteredTimeline.slice(1).map((point, index) => ({
        currentMatchNumber: point.matchNumber,
        currentSr: point.sr,
        previousMatchNumber: filteredTimeline[index]?.matchNumber ?? 0,
        previousSr: filteredTimeline[index]?.sr ?? 0,
        srChange: point.srChange,
      })),
    [filteredTimeline]
  )
  const winLossSummaryItems = useMemo(
    () => [
      {
        color: DASHBOARD_POSITIVE_COLOR,
        key: "wins",
        label: "Wins",
        value: winLossBreakdown.wins,
      },
      {
        color: DASHBOARD_NEGATIVE_COLOR,
        key: "losses",
        label: "Losses",
        value: winLossBreakdown.losses,
      },
    ],
    [winLossBreakdown.losses, winLossBreakdown.wins]
  )

  return (
    <section
      className={cn(
        embedded
          ? isMobileView
            ? "overflow-visible"
            : "overflow-hidden"
          : "overflow-hidden rounded-xl border border-border/60 bg-background",
        className
      )}
    >
      {showHeader ? (
        <div className="flex flex-col gap-1 border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Session trends</h2>
          <p className="text-sm text-muted-foreground">
            SR movement, outcomes, and daily performance for the selected active
            session.
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          isMobileView
            ? "grid gap-4"
            : "grid gap-px bg-border/40 xl:grid-cols-2"
        )}
      >
        <ChartPanel
          description="Session SR change across logged matches."
          title="SR progression"
          viewport={viewport}
        >
          {filteredTimeline.length <= 1 ? (
            <ChartEmptyState
              description="Log at least one match to chart SR movement."
              title="No SR trend yet"
              viewport={viewport}
            />
          ) : (
            <ChartContainer
              className={cn("w-full min-w-0", isMobileView ? "h-52.5" : "h-65")}
              config={srChartConfig}
            >
              <LineChart data={filteredTimeline}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="matchNumber"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  allowDataOverflow
                  axisLine={false}
                  domain={srAxisDomain}
                  tickLine={false}
                  tickMargin={8}
                  ticks={srAxisTicks}
                  width={56}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) =>
                        `Match ${payload?.[0]?.payload?.matchNumber ?? 0}`
                      }
                    />
                  }
                />
                {srSegments.map((segment) => (
                  <ReferenceLine
                    ifOverflow="extendDomain"
                    key={`${segment.previousMatchNumber}-${segment.currentMatchNumber}`}
                    segment={[
                      {
                        x: segment.previousMatchNumber,
                        y: segment.previousSr,
                      },
                      {
                        x: segment.currentMatchNumber,
                        y: segment.currentSr,
                      },
                    ]}
                    stroke={getDashboardMetricColor(segment.srChange)}
                    strokeLinecap="round"
                    strokeWidth={2}
                  />
                ))}
                <Line
                  activeDot={({ cx, cy, payload }) => {
                    if (typeof cx !== "number" || typeof cy !== "number") {
                      return null
                    }

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        fill={getDashboardMetricColor(payload?.srChange ?? 0)}
                        r={4}
                        stroke="var(--background)"
                        strokeWidth={1.5}
                      />
                    )
                  }}
                  dataKey="sr"
                  dot={false}
                  stroke="transparent"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ChartContainer>
          )}
        </ChartPanel>

        <ChartPanel
          description="Outcome breakdown for the active filter window."
          title="Win-loss split"
          viewport={viewport}
        >
          {winLossBreakdown.total === 0 ? (
            <ChartEmptyState
              description="Your first logged match will appear here."
              title="No matches yet"
              viewport={viewport}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <ChartContainer
                className={cn(
                  "w-full min-w-0",
                  isMobileView ? "h-52.5" : "h-65"
                )}
                config={winLossChartConfig}
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={winLossItems}
                    dataKey="value"
                    innerRadius={72}
                    nameKey="key"
                    outerRadius={96}
                    paddingAngle={3}
                  >
                    {winLossItems.map((item) => (
                      <Cell key={item.key} fill={`var(--color-${item.key})`} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-6",
                  isMobileView ? "justify-start" : "justify-center"
                )}
              >
                {winLossSummaryItems.map((item) => (
                  <div className="flex items-center gap-2" key={item.key}>
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <span
                      className="font-mono text-sm font-medium tabular-nums"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartPanel>

        <ChartPanel
          description="Session outcomes grouped by day."
          title="Daily wins and losses"
          viewport={viewport}
        >
          {dailyWinLossData.length === 0 ? (
            <ChartEmptyState
              description="Daily performance fills in once matches are logged."
              title="No daily activity"
              viewport={viewport}
            />
          ) : (
            <ChartContainer
              className={cn("w-full min-w-0", isMobileView ? "h-52.5" : "h-65")}
              config={winLossChartConfig}
            >
              <BarChart data={dailyWinLossData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="dateKey"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  width={44}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="wins"
                  fill="var(--color-wins)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="losses"
                  fill="var(--color-losses)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </ChartPanel>

        <ChartPanel
          description="Net SR change grouped by day."
          title="Daily SR gain"
          viewport={viewport}
        >
          {dailySrData.length === 0 ? (
            <ChartEmptyState
              description="SR totals appear after matches are logged."
              title="No SR data yet"
              viewport={viewport}
            />
          ) : (
            <ChartContainer
              className={cn("w-full min-w-0", isMobileView ? "h-52.5" : "h-65")}
              config={dailySrChartConfig}
            >
              <BarChart data={dailySrData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="dateKey"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  allowDataOverflow
                  axisLine={false}
                  domain={dailySrAxisDomain}
                  tickLine={false}
                  tickMargin={8}
                  ticks={dailySrAxisTicks}
                  width={44}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="netSr" radius={[4, 4, 0, 0]}>
                  {dailySrData.map((day) => (
                    <Cell
                      fill={getDashboardMetricColor(day.netSr)}
                      key={day.dateKey}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </ChartPanel>
      </div>
    </section>
  )
})
