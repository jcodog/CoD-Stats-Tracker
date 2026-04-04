"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { useConvex, useConvexAuth } from "convex/react"

import {
  LANDING_METRICS_REFETCH_MS,
  type LandingMetricsResponse,
} from "@workspace/backend/landing/metrics"
import { api } from "@workspace/backend/convex/_generated/api"

function formatCount(value: number) {
  return new Intl.NumberFormat("en-GB").format(value)
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)
}

export function LandingLiveStats({
  initialData = null,
}: {
  initialData?: LandingMetricsResponse | null
}) {
  const convex = useConvex()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()
  const { isLoaded, isSignedIn, user } = useUser()

  const userId = isSignedIn ? user?.id : undefined
  const queryEnabled = isSignedIn
    ? isLoaded && !isConvexAuthLoading && isAuthenticated
    : true
  const refetchInterval = isSignedIn
    ? Math.max(LANDING_METRICS_REFETCH_MS.authenticated * 3, 60_000)
    : Math.max(LANDING_METRICS_REFETCH_MS.anonymous * 6, 180_000)
  const staleTime = isSignedIn ? 60_000 : 5 * 60_000

  const { data, isPending, isError } = useQuery({
    queryKey: ["landing-live-stats", userId ?? "anonymous"],
    queryFn: () => convex.query(api.stats.getLandingMetrics, {}),
    enabled: queryEnabled,
    initialData: initialData ?? undefined,
    staleTime,
    gcTime: 15 * 60_000,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  })
  const showPendingState =
    !data && (isPending || (isSignedIn && (!isLoaded || isConvexAuthLoading)))

  const scopedStats = data
    ? (data.personal ?? data.global)
    : {
        matchesIndexed: 0,
        sessionsTracked: 0,
        activeSessions: 0,
        latestIngestedAt: null,
        winRate: 0,
      }

  const isPersonalized = Boolean(data?.personal)
  const showUnavailable = isError && !data

  const metrics = showPendingState
    ? [
        {
          label: "Indexed Matches",
          value: "Loading…",
        },
        {
          label: "Total Sessions",
          value: "Loading…",
        },
        {
          label: "Latest Match Sync",
          value: "Loading…",
        },
      ]
    : [
        {
          label: isPersonalized
            ? "Indexed Matches for Your Account"
            : "Indexed Matches Across CodStats",
          value: showUnavailable
            ? "Unavailable"
            : formatCount(scopedStats.matchesIndexed),
        },
        {
          label: isPersonalized
            ? "Total Sessions for Your Account"
            : "Total Sessions Across CodStats",
          value: showUnavailable
            ? "Unavailable"
            : formatCount(scopedStats.sessionsTracked),
        },
      ]

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm leading-7 text-foreground/72">
        {isPersonalized
          ? `Live for ${user?.firstName ?? "you"}: your ranked matches are being indexed against this account and fed straight into the dashboard views you use after each session.`
          : "This panel shows the public CodStats pulse. Sign in to swap it to your own indexed matches, tracked sessions, and latest sync timing."}
      </p>

      <div
        aria-live="polite"
        className="divide-y divide-border/70 border-y border-border/70"
      >
        {metrics.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3"
          >
            <span className="text-sm text-foreground/66">{item.label}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm leading-7 text-foreground/68">
        {showUnavailable
          ? "Live metrics are temporarily unavailable."
          : showPendingState
            ? "Win rate is loading…"
            : `${isPersonalized ? "Your" : "Platform"} win rate across indexed matches: ${formatPercentage(scopedStats.winRate)}%`}
      </p>
    </div>
  )
}
