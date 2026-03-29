"use client"

import type { CSSProperties } from "react"

import type { DashboardSessionOverview } from "@/features/dashboard-stats/lib/dashboard-stats-client"
import { formatDashboardPercent } from "@/features/dashboard-stats/lib/dashboard-stats-format"
import { getDashboardMetricTextStyle } from "@/features/dashboard-stats/lib/dashboard-stats-visuals"
import { cn } from "@workspace/ui/lib/utils"

function SummaryMetric({
  label,
  value,
  valueStyle,
}: {
  embedded?: boolean
  label: string
  value: string
  valueStyle?: CSSProperties
}) {
  return (
    <div className="px-6 py-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={valueStyle}
      >
        {value}
      </dd>
    </div>
  )
}

export function DashboardStatsSummary({
  className,
  embedded = false,
  overview,
  showHeader = true,
}: {
  className?: string
  embedded?: boolean
  overview: DashboardSessionOverview
  showHeader?: boolean
}) {
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
          <h2 className="text-base font-semibold">Session snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Stored ranked metrics for the selected session.
          </p>
        </div>
      ) : null}
      <dl className="grid border-t border-border/50 md:grid-cols-2 md:divide-x md:divide-border/50 xl:grid-cols-4">
        <SummaryMetric label="Start SR" value={`${overview.startSr}`} />
        <SummaryMetric label="Current SR" value={`${overview.currentSr}`} />
        <SummaryMetric
          label="Net SR"
          value={`${overview.netSr > 0 ? "+" : ""}${overview.netSr}`}
          valueStyle={getDashboardMetricTextStyle(overview.netSr)}
        />
        <SummaryMetric
          label="Win rate"
          value={formatDashboardPercent(overview.winRate)}
        />
      </dl>
    </section>
  )
}
