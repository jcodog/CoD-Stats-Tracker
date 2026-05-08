import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
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

  it("keeps creator transfers on the canonical staff subscriptions route", () => {
    const canonicalRoute =
      "apps/web/src/app/(staff-protected)/staff/(billing)/subscriptions/creator-transfers/page.tsx"
    const aliasRoute =
      "apps/web/src/app/(staff-protected)/staff/billing/subscriptions/creator-transfers/page.tsx"
    const routeSource = readRepoFile(canonicalRoute)
    const sectionSource = readRepoFile(
      "apps/web/src/features/staff/billing/lib/sections.ts"
    )

    expect(routeSource).toContain(
      'renderStaffBillingPage("subscriptions-creator-transfers")'
    )
    expect(sectionSource).toContain('href: "/staff/subscriptions/creator-transfers"')
    expect(sectionSource).toContain(
      'pathname.startsWith("/staff/subscriptions/creator-transfers")'
    )
    expect(sectionSource).not.toContain(
      'pathname.startsWith("/staff/billing/subscriptions/creator-transfers")'
    )
    expect(existsSync(resolve(REPO_ROOT, aliasRoute))).toBe(false)
  })

  it("requires typed confirmation before manual creator transfer execution", () => {
    const viewSource = readRepoFile(
      "apps/web/src/features/staff/billing/views/StaffBillingView.tsx"
    )
    const dialogSource = readRepoFile(
      "apps/web/src/features/staff/billing/components/creator-transfers/CreatorPayoutExecuteDialog.tsx"
    )

    expect(dialogSource).toContain("Execute manual transfer run")
    expect(dialogSource).toContain("Type EXECUTE")
    expect(dialogSource).toContain('args.state?.confirmation !== "EXECUTE"')
    expect(viewSource).toContain(
      "setCreatorPayoutExecuteConfirmationState({"
    )
    expect(viewSource).not.toContain(
      "onClick={() => void executeCreatorPayoutRun(row.original.id)}"
    )
  })

  it("keeps staff billing web code under the staff billing feature folder", () => {
    for (const path of [
      "apps/web/src/features/staff/views/StaffBillingView.tsx",
      "apps/web/src/features/staff/lib/render-staff-billing-page.tsx",
      "apps/web/src/features/staff/lib/staff-billing-sections.ts",
    ]) {
      expect(existsSync(resolve(REPO_ROOT, path))).toBe(false)
    }

    for (const path of [
      "apps/web/src/features/staff/billing/views/StaffBillingView.tsx",
      "apps/web/src/features/staff/billing/lib/render-staff-billing-page.tsx",
      "apps/web/src/features/staff/billing/lib/sections.ts",
      "apps/web/src/features/staff/billing/components/creator-transfers/CreatorPayoutExecuteDialog.tsx",
    ]) {
      expect(existsSync(resolve(REPO_ROOT, path))).toBe(true)
    }
  })

  it("keeps creator backend code in domain subfolders", () => {
    const oldFlatFiles = [
      "packages/backend/convex/actions/creator/attribution.ts",
      "packages/backend/convex/actions/creator/connect.ts",
      "packages/backend/convex/mutations/creator/account.ts",
      "packages/backend/convex/mutations/creator/attribution.ts",
      "packages/backend/convex/mutations/creator/internal.ts",
      "packages/backend/convex/queries/creator/attribution.ts",
      "packages/backend/convex/queries/creator/dashboard.ts",
      "packages/backend/convex/queries/creator/internal.ts",
      "packages/backend/src/lib/creatorAccounting.ts",
      "packages/backend/src/lib/creatorProgram.ts",
      "packages/backend/src/lib/creatorTransfers.ts",
      "packages/backend/src/db/tables/creatorAccounts.ts",
      "packages/backend/src/db/tables/creatorEarningLedger.ts",
      "packages/backend/src/db/tables/creatorPayoutRuns.ts",
      "packages/backend/src/db/tables/creatorPayoutTransfers.ts",
    ]

    for (const path of oldFlatFiles) {
      expect(existsSync(resolve(REPO_ROOT, path))).toBe(false)
    }

    for (const path of [
      "packages/backend/convex/actions/creator/connect/onboarding.ts",
      "packages/backend/convex/mutations/creator/accounts/internal.ts",
      "packages/backend/convex/queries/creator/dashboard/current.ts",
      "packages/backend/src/lib/creator/payouts/transfers.ts",
      "packages/backend/src/db/tables/creator/payouts/earningLedger.ts",
    ]) {
      expect(existsSync(resolve(REPO_ROOT, path))).toBe(true)
    }
  })
})
