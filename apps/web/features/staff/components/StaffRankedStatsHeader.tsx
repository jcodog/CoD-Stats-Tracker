"use client"

import { Badge } from "@workspace/ui/components/badge"
import {
  StaffMetricStrip,
  StaffPageIntro,
} from "@/features/staff/components/StaffConsolePrimitives"

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
        sessionWritesEnabled: boolean
      }
    | null
  openSessionCount: number
}) {
  return (
    <div className="flex flex-col gap-8">
      <StaffPageIntro
        description="Staff control the current ranked title and season here. Admins keep the title, mode, and map catalog lean so the flagged dashboard can create sessions and log matches against the current ruleset."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {currentConfig ? (
              <>
                <Badge variant="secondary">{currentConfig.activeTitleLabel}</Badge>
                <Badge variant="outline">Season {currentConfig.activeSeason}</Badge>
                <Badge variant="outline">
                  {currentConfig.sessionWritesEnabled
                    ? "Player writes enabled"
                    : "Player writes paused"}
                </Badge>
              </>
            ) : (
              <Badge variant="outline">Config not set</Badge>
            )}
            <Badge variant="outline">
              {adminEnabled ? "Admin controls enabled" : "Staff config only"}
            </Badge>
          </div>
        }
        title="Ranked Stats"
      />

      <StaffMetricStrip
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
          {
            label: "Match logging",
            value: currentConfig
              ? currentConfig.sessionWritesEnabled
                ? "Enabled"
                : "Paused"
              : "Not set",
          },
        ]}
      />
    </div>
  )
}
