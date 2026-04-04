import "server-only"

import { auth } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"
import type { LandingMetricsResponse } from "@workspace/backend/landing/metrics"

export async function resolveLandingMetricsInitialState() {
  const { getToken } = await auth()
  const token = await getToken({ template: "convex" }).catch(() => null)

  try {
    return (await fetchQuery(
      api.stats.getLandingMetrics,
      {},
      token ? { token } : {}
    )) as LandingMetricsResponse
  } catch (error) {
    console.error("Landing metrics initial load failed", error)
    return null
  }
}
