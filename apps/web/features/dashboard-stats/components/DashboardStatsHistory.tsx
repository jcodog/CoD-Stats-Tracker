"use client"

import type { DashboardState } from "@/features/dashboard-stats/lib/dashboard-stats-client"
import { formatDashboardDateTime } from "@/features/dashboard-stats/lib/dashboard-stats-format"
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

export function DashboardStatsHistory({
  className,
  archivedSessions,
  embedded = false,
  showHeader = true,
}: {
  className?: string
  archivedSessions: DashboardState["archivedSessions"]
  embedded?: boolean
  showHeader?: boolean
}) {
  const sessions = archivedSessions as Array<{
    archivedReason: string | null
    endedAt: number | null
    id: string
    losses: number
    netSr: number
    season: number
    startedAt: number
    titleLabel: string
    usernameLabel: string | null
    wins: number
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
          <h2 className="text-base font-semibold">Session history</h2>
          <p className="text-sm text-muted-foreground">
            Archived sessions stay visible after staff roll the current title or season.
          </p>
        </div>
      ) : null}

      <div className="px-6 py-6">
        {sessions.length === 0 ? (
          <Empty className="rounded-xl border border-dashed border-border/60 bg-muted/10">
            <EmptyHeader>
              <EmptyTitle>No archived sessions yet</EmptyTitle>
              <EmptyDescription>
                Historical sessions appear here after title or season rollover.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Archived</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Net SR</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{session.usernameLabel ?? "Legacy session"}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.titleLabel} season {session.season}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDashboardDateTime(session.startedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDashboardDateTime(session.endedAt)}
                    </TableCell>
                    <TableCell>
                      {session.wins}-{session.losses}
                    </TableCell>
                    <TableCell>
                      {session.netSr > 0 ? "+" : ""}
                      {session.netSr}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {session.archivedReason
                          ? session.archivedReason.replaceAll("_", " ")
                          : "archived"}
                      </Badge>
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
