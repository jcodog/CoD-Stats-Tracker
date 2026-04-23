import { describe, expect, it } from "bun:test"

import { resolveDashboardStatsEditorInitialState } from "../dashboard-stats-server.ts"

describe("dashboard stats server initial state", () => {
  it("returns authFailed without querying when the Convex token is missing", async () => {
    let queried = false

    const result = await resolveDashboardStatsEditorInitialState({
      token: null,
      fetchDashboardState: async () => {
        queried = true
        return { id: "should-not-run" }
      },
    })

    expect(result).toEqual({
      authFailed: true,
      initialDashboardState: null,
    })
    expect(queried).toBe(false)
  })

  it("returns a null initial state instead of throwing when the fetch fails", async () => {
    const errors = []

    const result = await resolveDashboardStatsEditorInitialState({
      token: "convex-token",
      fetchDashboardState: async () => {
        throw new Error("boom")
      },
      onError: (error) => {
        errors.push(error)
      },
    })

    expect(result).toEqual({
      authFailed: false,
      initialDashboardState: null,
    })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toBeInstanceOf(Error)
    expect(errors[0].message).toBe("boom")
  })

  it("returns the initial dashboard state when the fetch succeeds", async () => {
    const dashboardState = {
      currentConfig: null,
      activeSessions: [],
      planKey: "free",
      setupState: {
        needsConfig: false,
        needsMaps: false,
        needsModes: false,
        needsTitle: false,
      },
    }

    const result = await resolveDashboardStatsEditorInitialState({
      token: "convex-token",
      fetchDashboardState: async (token) => {
        expect(token).toBe("convex-token")
        return dashboardState
      },
    })

    expect(result).toEqual({
      authFailed: false,
      initialDashboardState: dashboardState,
    })
  })
})
