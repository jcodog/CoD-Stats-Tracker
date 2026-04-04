"use client"

import type { CSSProperties } from "react"

import type { DashboardSessionOverview } from "@/features/dashboard-stats/lib/dashboard-stats-client"
import { formatDashboardPercent } from "@/features/dashboard-stats/lib/dashboard-stats-format"
import { getDashboardMetricTextStyle } from "@/features/dashboard-stats/lib/dashboard-stats-visuals"
import { cn } from "@workspace/ui/lib/utils"

function SummaryMetric({
  label,
  mobileView = false,
  value,
  valueStyle,
}: {
  embedded?: boolean
  label: string
  mobileView?: boolean
  value: string
  valueStyle?: CSSProperties
}) {
  if (mobileView) {
    return (
      <div className="flex items-end justify-between gap-4 py-4">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd
          className="text-3xl font-semibold tracking-tight text-right"
          style={valueStyle}
        >
          {value}
        </dd>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "px-6 py-5"
      )}
    >
      <dt
        className={cn(
          "text-sm text-muted-foreground"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "mt-2 font-semibold tracking-tight",
          "text-3xl"
        )}
        style={valueStyle}
      >
        {value}
      </dd>
    </div>
  )
}

export function DashboardStatsSummary({
  className,
  description = "Start SR, Current SR, and Net SR reflect the stored session. Win rate follows the active time range.",
  embedded = false,
  overview,
  showHeader = true,
  viewport = "desktop",
  winRate = overview.winRate,
}: {
  className?: string
  description?: string
  embedded?: boolean
  overview: DashboardSessionOverview
  showHeader?: boolean
  viewport?: "desktop" | "mobile"
  winRate?: number | null
}) {
  const isMobileView = viewport === "mobile"

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
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ) : null}
      <dl
        className={cn(
          isMobileView
            ? "divide-y divide-border/60 border-y border-border/60"
            : "grid border-t border-border/50 md:grid-cols-2 md:divide-x md:divide-border/50 xl:grid-cols-4",
          isMobileView && !showHeader ? "" : ""
        )}
      >
        <SummaryMetric
          label="Start SR"
          mobileView={isMobileView}
          value={`${overview.startSr}`}
        />
        <SummaryMetric
          label="Current SR"
          mobileView={isMobileView}
          value={`${overview.currentSr}`}
        />
        <SummaryMetric
          label="Net SR"
          mobileView={isMobileView}
          value={`${overview.netSr > 0 ? "+" : ""}${overview.netSr}`}
          valueStyle={getDashboardMetricTextStyle(overview.netSr)}
        />
        <SummaryMetric
          label="Win rate"
          mobileView={isMobileView}
          value={winRate === null ? "—" : formatDashboardPercent(winRate)}
        />
      </dl>
    </section>
  )
}
