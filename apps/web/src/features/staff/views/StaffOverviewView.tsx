import type { AuditLogResult } from "@workspace/backend/lib/staffRoles"
import type { StaffOverviewDashboard } from "@workspace/backend/lib/staffTypes"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import {
  StaffKeyValueGrid,
  StaffMetricStrip,
  StaffPageIntro,
  StaffSection,
} from "@/features/staff/components/StaffConsolePrimitives"
import { STAFF_CONSOLE_TITLE } from "@/features/staff/lib/staff-navigation"

function getAuditResultVariant(result: AuditLogResult) {
  if (result === "success") {
    return "secondary"
  }

  if (result === "error") {
    return "destructive"
  }

  return "outline"
}

function getActivityArea(entityType: string) {
  return entityType.startsWith("billing") ? "Billing" : "Access"
}

function getBarWidth(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return "0%"
  }

  return `${Math.max((value / max) * 100, 8)}%`
}

function formatDateTime(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function getSyncBadge(args: StaffOverviewDashboard["lastSync"]) {
  if (!args) {
    return <Badge variant="outline">Not run yet</Badge>
  }

  if (args.result === "success") {
    return <Badge variant="secondary">Healthy</Badge>
  }

  if (args.result === "error") {
    return <Badge variant="destructive">Needs review</Badge>
  }

  return <Badge variant="outline">Warnings</Badge>
}

export function StaffOverviewView({
  overview,
}: {
  overview: StaffOverviewDashboard
}) {
  const subscriptionBreakdown = overview.subscriptionStatusCounts.map(
    ({ count, status }) => ({
      count,
      label:
        status === "past_due"
          ? "Past due"
          : status === "trialing"
            ? "Trialing"
            : status === "paused"
              ? "Paused"
              : "Active",
    })
  )
  const totalSubscriptions = subscriptionBreakdown.reduce(
    (sum, item) => sum + item.count,
    0
  )
  const recentActivityVolume = overview.activityTimeline.reduce(
    (sum, item) => sum + item.count,
    0
  )
  const latestActivityAt = overview.recentActivity[0]?.createdAt
  const maxSubscriptionCount = Math.max(
    ...subscriptionBreakdown.map((item) => item.count),
    0
  )

  return (
    <div className="flex flex-1 flex-col gap-8">
      <StaffPageIntro
        description={
          <>
            Monitor user coverage, billing health, and recent privileged
            activity from the {STAFF_CONSOLE_TITLE.toLowerCase()}.
          </>
        }
        title="Overview"
      />

      <StaffMetricStrip
        items={[
          { label: "Tracked users", value: overview.counts.trackedUsers },
          { label: "Staff", value: overview.counts.staffUsers },
          { label: "Admins", value: overview.counts.adminUsers },
          {
            label: "Super-admins",
            value: overview.counts.superAdminUsers,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <StaffSection
          action={
            overview.cancelAtPeriodEndCount > 0 ? (
              <Badge variant="outline">
                {overview.cancelAtPeriodEndCount} canceling at period end
              </Badge>
            ) : null
          }
          description="Current subscription distribution across the statuses staff can act on."
          title="Subscription Health"
        >
          {totalSubscriptions > 0 ? (
            <div className="grid gap-4">
              {subscriptionBreakdown.map((item) => (
                <div className="grid gap-2" key={item.label}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-muted-foreground tabular-nums">
                      {item.count}
                    </div>
                  </div>
                  <div className="h-2 bg-muted">
                    <div
                      className="h-full bg-foreground/80"
                      style={{
                        width: getBarWidth(item.count, maxSubscriptionCount),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-55 items-center text-sm text-muted-foreground">
              No in-scope subscription records are currently available.
            </div>
          )}
        </StaffSection>

        <StaffSection
          description="Current catalog coverage, billing sync state, and recent staff activity at a glance."
          title="Operational Snapshot"
        >
          <StaffKeyValueGrid
            rows={[
              { label: "Plans", value: overview.counts.billingPlans },
              { label: "Features", value: overview.counts.billingFeatures },
              {
                label: "Need sync attention",
                value: overview.counts.syncAttentionPlans,
              },
              {
                label: "Active or trialing",
                value: overview.counts.activeSubscriptions,
              },
              {
                label: "Need attention",
                value: overview.counts.attentionSubscriptions,
              },
              {
                label: "Last sync",
                value: formatDateTime(overview.lastSync?.syncedAt),
              },
              {
                label: "Sync status",
                value: getSyncBadge(overview.lastSync),
              },
              {
                label: "Warnings",
                value: overview.lastSync?.warningCount ?? 0,
              },
              {
                label: "7d staff events",
                value: recentActivityVolume,
              },
              {
                label: "Latest event",
                value: formatDateTime(latestActivityAt),
              },
            ]}
          />
        </StaffSection>
      </div>

      <StaffSection
        contentClassName="overflow-x-auto p-0 pr-3 pb-3"
        description="The latest staff events that are relevant to the current operator role."
        title="Recent Activity"
      >
        {overview.recentActivity.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.recentActivity.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="w-44 text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(log.createdAt)}
                  </TableCell>
                  <TableCell className="w-32">
                    <Badge variant="outline">
                      {getActivityArea(log.entityType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-normal">
                    <div className="font-medium">{log.summary}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {log.actorName}
                    </div>
                  </TableCell>
                  <TableCell className="w-28">
                    <Badge variant={getAuditResultVariant(log.result)}>
                      {log.result}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-6 py-10 text-sm text-muted-foreground">
            No recent staff activity is currently available.
          </div>
        )}
      </StaffSection>
    </div>
  )
}
