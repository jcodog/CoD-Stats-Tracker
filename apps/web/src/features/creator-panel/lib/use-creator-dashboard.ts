"use client"

import { useEffect, useMemo } from "react"
import { useConvexAuth, usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@workspace/backend/convex/_generated/api"
import { aggregateCreatorMetrics } from "@workspace/backend/lib/creator/dashboardMetrics"

export function useCreatorDashboard() {
  const { isAuthenticated } = useConvexAuth()
  const dashboard = useQuery(
    api.queries.creator.dashboard.current.getCurrentCreatorDashboard,
    isAuthenticated ? {} : "skip"
  )
  const ready = isAuthenticated && Boolean(dashboard?.creatorAccount)
  const query = api.queries.creator.dashboard.current.getCreatorMetricsPage
  const attributions = usePaginatedQuery(
    query,
    ready ? { kind: "attributions" } : "skip",
    { initialNumItems: 50 }
  )
  const locks = usePaginatedQuery(query, ready ? { kind: "locks" } : "skip", {
    initialNumItems: 50,
  })
  const earnings = usePaginatedQuery(
    query,
    ready ? { kind: "earnings" } : "skip",
    { initialNumItems: 50 }
  )
  const { status: attributionStatus, loadMore: loadAttributions } = attributions
  const { status: lockStatus, loadMore: loadLocks } = locks
  const { status: earningsStatus, loadMore: loadEarnings } = earnings
  useEffect(() => {
    if (attributionStatus === "CanLoadMore") loadAttributions(50)
    if (lockStatus === "CanLoadMore") loadLocks(50)
    if (earningsStatus === "CanLoadMore") loadEarnings(50)
  }, [
    attributionStatus,
    lockStatus,
    earningsStatus,
    loadAttributions,
    loadLocks,
    loadEarnings,
  ])
  const metrics = useMemo(
    () =>
      aggregateCreatorMetrics([
        ...attributions.results,
        ...locks.results,
        ...earnings.results,
      ]),
    [attributions.results, locks.results, earnings.results]
  )
  if (!dashboard) return dashboard
  return {
    ...dashboard,
    ...metrics,
    metricsComplete:
      attributionStatus === "Exhausted" &&
      lockStatus === "Exhausted" &&
      earningsStatus === "Exhausted",
  }
}
