import { describe, expect, it } from "bun:test"

import {
  buildInviteMessagePreview,
  getInviteCodeTypeLabel,
  renderInviteCodeInstructions,
} from "../playingWithViewers.js"

describe("playing with viewers invite templates", () => {
  it("renders party code instructions with the selected code", () => {
    const instructions = renderInviteCodeInstructions({
      inviteCode: "ABC123",
      inviteCodeType: "party_code",
    })

    expect(getInviteCodeTypeLabel("party_code")).toBe("Party code")
    expect(instructions).toContain("Join Party")
    expect(instructions).toContain("`ABC123`")
  })

  it("renders private match preview with the selected code", () => {
    const preview = buildInviteMessagePreview({
      creatorDisplayName: "Streamer",
      gameLabel: "Call of Duty",
      inviteCode: "PM-42",
      inviteCodeType: "private_match_code",
      title: "Play with Streamer",
    })

    expect(getInviteCodeTypeLabel("private_match_code")).toBe(
      "Private match code"
    )
    expect(preview).toContain("Private match code: PM-42")
    expect(preview).toContain("Join Private Match")
  })
})
