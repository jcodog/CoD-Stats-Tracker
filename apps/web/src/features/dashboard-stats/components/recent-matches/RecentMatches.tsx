"use client"

import { useMemo, useState } from "react"

import type { DashboardRecentSessionMatches } from "@/features/dashboard-stats/lib/client/dashboard-state"
import {
  formatDashboardDateTime,
  getMapLabel,
  getModeLabel,
  getTimeRangeStart,
} from "@/features/dashboard-stats/lib/formatting/numbers"
import {
  getDashboardMetricTextStyle,
  getDashboardOutcomeBadgeStyle,
} from "@/features/dashboard-stats/lib/visuals/metrics"
import type { DashboardTimeRange } from "@/features/dashboard-stats/stores/dashboard-ui-store"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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

const MATCHES_PER_PAGE = 15

type DashboardMatchRow = {
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
}

export function DashboardStatsRecentMatches({
  className,
  embedded = false,
  matches,
  selectedTimeRange,
  showHeader = true,
}: {
  className?: string
  embedded?: boolean
  matches: DashboardRecentSessionMatches
  selectedTimeRange: DashboardTimeRange
  showHeader?: boolean
}) {
  const recentMatches = matches as DashboardMatchRow[]
  const timeRangeStart = getTimeRangeStart(selectedTimeRange)
  const filteredMatches = useMemo(
    () =>
      recentMatches.filter(
        (match) => timeRangeStart === null || match.createdAt >= timeRangeStart
      ),
    [recentMatches, timeRangeStart]
  )
  const paginationScope = `${selectedTimeRange}:${recentMatches.length}:${recentMatches[0]?.id ?? "none"}:${recentMatches[recentMatches.length - 1]?.id ?? "none"}`
  const [paginationState, setPaginationState] = useState(() => ({
    currentPage: 1,
    scope: paginationScope,
  }))
  const totalMatches = filteredMatches.length
  const totalPages = Math.max(1, Math.ceil(totalMatches / MATCHES_PER_PAGE))
  const currentPage =
    paginationState.scope === paginationScope ? paginationState.currentPage : 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * MATCHES_PER_PAGE
  const paginatedMatches = filteredMatches.slice(
    pageStartIndex,
    pageStartIndex + MATCHES_PER_PAGE
  )
  const visibleMatchStart = totalMatches === 0 ? 0 : pageStartIndex + 1
  const visibleMatchEnd = Math.min(
    totalMatches,
    pageStartIndex + MATCHES_PER_PAGE
  )

  function setCurrentPage(nextPage: number) {
    setPaginationState({
      currentPage: nextPage,
      scope: paginationScope,
    })
  }

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
            The latest 50 matches, filtered to your selected date range.
          </p>
        </div>
      ) : null}

      <div className="py-4">
        {filteredMatches.length === 0 ? (
          <Empty
            className={cn(
              "border-y border-dashed border-border/60 bg-muted/10",
              embedded ? "rounded-none" : "rounded-lg"
            )}
          >
            <EmptyHeader>
              <EmptyTitle>No matches in this filter</EmptyTitle>
              <EmptyDescription>
                Try a wider date range or log more matches to populate this
                session view.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {visibleMatchStart}-{visibleMatchEnd}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalMatches}
                </span>{" "}
                matches.
              </p>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    disabled={safeCurrentPage === 1}
                    onClick={() =>
                      setCurrentPage(Math.max(safeCurrentPage - 1, 1))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="min-w-[88px] text-center text-sm text-muted-foreground">
                    Page{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {safeCurrentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {totalPages}
                    </span>
                  </span>
                  <Button
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage(Math.min(safeCurrentPage + 1, totalPages))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>

            <div
              role="region"
              aria-label="Recent match results"
              tabIndex={0}
              className={cn(
                "overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring",
                embedded ? "" : "rounded-xl border border-border/60"
              )}
            >
              <Table>
                <caption className="sr-only">
                  Latest session matches in the selected date range
                </caption>
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
                  {paginatedMatches.map((match) => (
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
                          <span className="ml-2 text-xs text-muted-foreground">
                            LP
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {match.kills ?? "-"} / {match.deaths ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[240px] text-sm whitespace-normal text-muted-foreground">
                        {match.notes ?? "No note"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
