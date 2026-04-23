import { describe, expect, it } from "bun:test"

import {
  getLogMatchStepDefinition,
  getVisibleLogMatchSteps,
} from "../dashboard-stats-log-match-flow.ts"

describe("dashboard stats log match flow", () => {
  it("places SR as the last basic step before review", () => {
    expect(
      getVisibleLogMatchSteps({
        loggingMode: "basic",
        requiresSessionSelection: false,
      })
    ).toEqual(["outcome", "mode", "map", "srChange", "review"])
  })

  it("places SR as the last comprehensive step before review", () => {
    expect(
      getVisibleLogMatchSteps({
        loggingMode: "comprehensive",
        requiresSessionSelection: false,
      })
    ).toEqual([
      "outcome",
      "mode",
      "map",
      "stats",
      "notes",
      "srChange",
      "review",
    ])
  })

  it("keeps session selection ahead of the reordered steps", () => {
    expect(
      getVisibleLogMatchSteps({
        loggingMode: "basic",
        requiresSessionSelection: true,
      })
    ).toEqual(["session", "outcome", "mode", "map", "srChange", "review"])
  })

  it("describes loss protection on the SR step in both flows", () => {
    expect(
      getLogMatchStepDefinition("srChange", "basic").description
    ).toContain("loss protection")
    expect(
      getLogMatchStepDefinition("srChange", "comprehensive").description
    ).toContain("loss protection")
  })

  it("keeps optional stats separate from the SR step copy", () => {
    expect(
      getLogMatchStepDefinition("stats", "comprehensive").description
    ).not.toContain("loss protection")
  })
})
