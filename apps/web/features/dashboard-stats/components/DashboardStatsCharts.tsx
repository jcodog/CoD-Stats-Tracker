"use client"

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

function getSrAxisDomain(
  points: Array<{
    sr: number
  }>
) {
  if (points.length === 0) {
    return [0, 100] as const
  }

  const values = points.map((point) => point.sr)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const lowerBound = Math.max(0, Math.floor((minValue - 1) / 100) * 100)
  const upperBound = Math.ceil((maxValue + 1) / 100) * 100

  return [lowerBound, upperBound] as const
}

function getDailySrAxisDomain(
  points: Array<{
    netSr: number
  }>
) {
  if (points.length === 0) {
    return [-100, 100] as const
  }

  const values = points.map((point) => point.netSr)
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const lowerBound = Math.floor(minValue / 100) * 100
  const upperBound = Math.ceil(maxValue / 100) * 100

  if (lowerBound === upperBound) {
    return [-100, 100] as const
  }

  return [lowerBound, upperBound] as const
}

function ChartPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: string
  title: string
}) {
  return (
    <div className="bg-background px-6 py-6">
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
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-background px-6 text-center">
      <div className="font-medium">{title}</div>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function DashboardStatsCharts({
  className,
  dailyPerformance,
  embedded = false,
  selectedTimeRange,
  showHeader = true,
  srTimeline,
  winLossBreakdown,
}: {
  className?: string
  dailyPerformance: DashboardSessionDailyPerformance
  embedded?: boolean
  selectedTimeRange: DashboardTimeRange
  showHeader?: boolean
  srTimeline: DashboardSessionSrTimeline
  winLossBreakdown: DashboardSessionWinLossBreakdown
}) {
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
  const filteredTimeline = timelinePoints.filter(
    (point) => timeRangeStart === null || point.createdAt >= timeRangeStart
  )
  const srAxisDomain = getSrAxisDomain(filteredTimeline)
  const filteredDaily = dailyPoints.filter((day) => {
    if (timeRangeStart === null) {
      return true
    }

    return new Date(`${day.dateKey}T00:00:00.000Z`).getTime() >= timeRangeStart
  })
  const dailyWinLossData = filteredDaily.map((day) => ({
    dateKey: formatDashboardDay(day.dateKey),
    losses: day.losses,
    wins: day.wins,
  }))
  const dailySrData = filteredDaily.map((day) => ({
    dateKey: formatDashboardDay(day.dateKey),
    netSr: day.netSr,
  }))
  const dailySrAxisDomain = getDailySrAxisDomain(dailySrData)
  const srSegments = filteredTimeline.slice(1).map((point, index) => ({
    currentMatchNumber: point.matchNumber,
    currentSr: point.sr,
    previousMatchNumber: filteredTimeline[index]?.matchNumber ?? 0,
    previousSr: filteredTimeline[index]?.sr ?? 0,
    srChange: point.srChange,
  }))
  const winLossSummaryItems = [
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
  ]

  return (
    <section
      className={cn(
        embedded
          ? "overflow-hidden"
          : "overflow-hidden rounded-xl border border-border/60 bg-background",
        className
      )}
    >
      {showHeader ? (
        <div className="flex flex-col gap-1 border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Session trends</h2>
          <p className="text-sm text-muted-foreground">
            SR movement, outcomes, and daily performance for the selected active session.
          </p>
        </div>
      ) : null}

      <div className="grid gap-px bg-border/40 xl:grid-cols-2">
        <ChartPanel
          description="Session SR change across logged matches."
          title="SR progression"
        >
          {filteredTimeline.length <= 1 ? (
            <ChartEmptyState
              description="Log at least one match to chart SR movement."
              title="No SR trend yet"
            />
          ) : (
            <ChartContainer className="h-[260px] w-full" config={srChartConfig}>
              <LineChart data={filteredTimeline}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="matchNumber"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  domain={srAxisDomain}
                  tickLine={false}
                  tickMargin={8}
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
          description="Current session outcome breakdown."
          title="Win-loss split"
        >
          {winLossBreakdown.total === 0 ? (
            <ChartEmptyState
              description="Your first logged match will appear here."
              title="No matches yet"
            />
          ) : (
            <div className="flex flex-col gap-4">
              <ChartContainer className="h-[260px] w-full" config={winLossChartConfig}>
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
              <div className="flex flex-wrap items-center justify-center gap-6">
                {winLossSummaryItems.map((item) => (
                  <div className="flex items-center gap-2" key={item.key}>
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
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
        >
          {dailyWinLossData.length === 0 ? (
            <ChartEmptyState
              description="Daily performance fills in once matches are logged."
              title="No daily activity"
            />
          ) : (
            <ChartContainer className="h-[260px] w-full" config={winLossChartConfig}>
              <BarChart data={dailyWinLossData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="dateKey"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} width={44} />
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

        <ChartPanel description="Net SR change grouped by day." title="Daily SR gain">
          {dailySrData.length === 0 ? (
            <ChartEmptyState
              description="SR totals appear after matches are logged."
              title="No SR data yet"
            />
          ) : (
            <ChartContainer className="h-[260px] w-full" config={dailySrChartConfig}>
              <BarChart data={dailySrData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="dateKey"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  domain={dailySrAxisDomain}
                  tickLine={false}
                  tickMargin={8}
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
}
