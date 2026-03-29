"use client"

import type { DashboardRecentSessionMatches } from "@/features/dashboard-stats/lib/dashboard-stats-client"
import {
  formatDashboardDateTime,
  getMapLabel,
  getModeLabel,
} from "@/features/dashboard-stats/lib/dashboard-stats-format"
import {
  getDashboardMetricTextStyle,
  getDashboardOutcomeBadgeStyle,
} from "@/features/dashboard-stats/lib/dashboard-stats-visuals"
import { Badge } from "@workspace/ui/components/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

export function DashboardStatsRecentMatches({
  className,
  embedded = false,
  matches,
  showHeader = true,
}: {
  className?: string
  embedded?: boolean
  matches: DashboardRecentSessionMatches
  showHeader?: boolean
}) {
  const recentMatches = matches as Array<{
    createdAt: number
    deaths: number | null
    id: string
    kills: number | null
    lossProtected: boolean
    mapName: string | null
    mode: string | null
    notes: string | null
    outcome: "loss" | "win"
    srChange: number
  }>

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
          <h2 className="text-base font-semibold">Recent matches</h2>
          <p className="text-sm text-muted-foreground">
            Latest logs for the selected active session.
          </p>
        </div>
      ) : null}

      <div className="px-6 py-6">
        {recentMatches.length === 0 ? (
          <Empty
            className={cn(
              "border border-dashed border-border/60 bg-muted/10",
              embedded ? "rounded-lg" : "rounded-xl"
            )}
          >
            <EmptyHeader>
              <EmptyTitle>No matches logged yet</EmptyTitle>
              <EmptyDescription>
                Use the log match flow to start building SR and win-rate history.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div
            className={cn(
              "overflow-x-auto",
              embedded ? "" : "rounded-xl border border-border/60"
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Played</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Map</TableHead>
                  <TableHead>SR</TableHead>
                  <TableHead>K / D</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDashboardDateTime(match.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="capitalize"
                        style={getDashboardOutcomeBadgeStyle(match.outcome)}
                        variant="outline"
                      >
                        {match.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell>{getModeLabel(match.mode)}</TableCell>
                    <TableCell>{getMapLabel(match.mapName)}</TableCell>
                    <TableCell
                      className="font-medium"
                      style={getDashboardMetricTextStyle(match.srChange)}
                    >
                      {match.srChange > 0 ? "+" : ""}
                      {match.srChange}
                      {match.lossProtected ? (
                        <span className="ml-2 text-xs text-muted-foreground">LP</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {match.kills ?? "-"} / {match.deaths ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {match.notes ?? "No note"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}
