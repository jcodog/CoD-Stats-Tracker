import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const REPO_ROOT = resolve(import.meta.dir, "../../../../..")

function readRepoFile(path) {
  return readFileSync(resolve(REPO_ROOT, path), "utf8")
}

describe("staff payout query hardening", () => {
  it("keeps payout dashboard queries bounded and indexed", () => {
    const source = readRepoFile("packages/backend/convex/queries/staff/internal.ts")

    expect(source).not.toContain('query("creatorEarningLedger").collect()')
    expect(source).not.toContain('query("creatorPayoutTransfers").collect()')
    expect(source).toContain('withIndex("by_status_invoiceIssuedAt"')
    expect(source).toContain('withIndex("by_status_createdAt"')
    expect(source).toContain('creatorPayoutRunCreatedAfter')
    expect(source).toContain('withIndex("by_updatedAt"')
    expect(source).toContain(".take(5000)")
    expect(source).toContain(".take(100)")
  })

  it("removes the staff billing creator-transfer route alias", () => {
    expect(() =>
      readRepoFile(
        "apps/web/src/app/(staff-protected)/staff/billing/subscriptions/creator-transfers/page.tsx"
      )
    ).toThrow()
  })
})
