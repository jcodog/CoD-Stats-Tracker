"use client"

import { Badge } from "@workspace/ui/components/badge"

function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: number | string }>
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <dl className="grid gap-px bg-border/60 md:grid-cols-3">
        {items.map((item) => (
          <div className="bg-background px-5 py-4" key={item.label}>
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function StaffRankedStatsHeader({
  adminEnabled,
  currentConfig,
  openSessionCount,
}: {
  adminEnabled: boolean
  currentConfig:
    | {
        activeSeason: number
        activeTitleLabel: string
      }
    | null
  openSessionCount: number
}) {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              Ranked Stats
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Staff control the current ranked title and season here. Admins keep the
              title, mode, and map catalog lean so the flagged dashboard can create
              sessions and log matches against the current ruleset.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentConfig ? (
              <>
                <Badge variant="secondary">{currentConfig.activeTitleLabel}</Badge>
                <Badge variant="outline">Season {currentConfig.activeSeason}</Badge>
              </>
            ) : (
              <Badge variant="outline">Config not set</Badge>
            )}
            <Badge variant="outline">
              {adminEnabled ? "Admin controls enabled" : "Staff config only"}
            </Badge>
          </div>
        </div>
      </header>

      <MetricStrip
        items={[
          {
            label: "Current title",
            value: currentConfig?.activeTitleLabel ?? "Not configured",
          },
          {
            label: "Current season",
            value: currentConfig?.activeSeason ?? "Not set",
          },
          {
            label: "Open sessions on next rollover",
            value: openSessionCount,
          },
        ]}
      />
    </div>
  )
}
