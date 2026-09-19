import { describe, expect, it } from "bun:test"
import { getCreatorMetricsPage } from "../queries/creator/dashboard/current.ts"
import { aggregateCreatorMetrics } from "../../src/lib/creator/dashboardMetrics.ts"

function context(extra = {}, signedIn = true) {
  const tables = {
    users: [{ _id: "owner", clerkUserId: "clerk-owner" }],
    creatorAccounts: [{ _id: "creator", userId: "owner" }],
    ...extra,
  }
  const reads = []
  return {
    reads,
    auth: {
      getUserIdentity: async () =>
        signedIn ? { subject: "clerk-owner" } : null,
    },
    db: {
      query(table) {
        const filters = []
        const rows = () =>
          (tables[table] ?? []).filter((row) =>
            filters.every(([key, value]) => row[key] === value)
          )
        const q = {
          withIndex(index, apply) {
            reads.push({ table, index })
            apply({
              eq(key, value) {
                filters.push([key, value])
                return this
              },
            })
            return q
          },
          async unique() {
            const found = rows()
            if (found.length > 1) throw new Error("Non-unique fixture")
            return found[0] ?? null
          },
          async first() {
            return rows()[0] ?? null
          },
          async paginate(options) {
            reads.push({ table, options })
            const offset = Number(options.cursor ?? 0)
            const all = rows()
            const page = all.slice(offset, offset + options.numItems)
            return {
              page,
              isDone: offset + page.length >= all.length,
              continueCursor: String(offset + page.length),
            }
          },
          collect() {
            throw new Error("Unbounded creator read")
          },
        }
        return q
      },
    },
  }
}
const paginationOpts = { numItems: 1000, cursor: null }

describe("creator metrics pages", () => {
  it("bounds scoped earnings and excludes non-estimate statuses", async () => {
    const ctx = context({
      creatorEarningLedger: [
        ...Array.from({ length: 60 }, () => ({
          creatorAccountId: "creator",
          status: "eligible",
          currency: "gbp",
          earningAmount: 100,
        })),
        {
          creatorAccountId: "other",
          status: "eligible",
          currency: "gbp",
          earningAmount: 99999,
        },
        {
          creatorAccountId: "creator",
          status: "transferred",
          currency: "gbp",
          earningAmount: 99999,
        },
      ],
    })
    const first = await getCreatorMetricsPage._handler(ctx, {
      kind: "earnings",
      paginationOpts,
    })
    expect(first.page).toHaveLength(50)
    expect(first.isDone).toBe(false)
    const second = await getCreatorMetricsPage._handler(ctx, {
      kind: "earnings",
      paginationOpts: { ...paginationOpts, cursor: first.continueCursor },
    })
    expect(second.page).toHaveLength(10)
    expect(second.isDone).toBe(true)
    expect(
      aggregateCreatorMetrics([...first.page, ...second.page])
        .estimatedEarningsByCurrency
    ).toEqual([{ currency: "gbp", amount: 6000 }])
  })
  it("uses the bound subscription for a usage lock, not another subscription", async () => {
    const ctx = context({
      creatorCodeUsageLocks: [
        {
          creatorAccountId: "creator",
          userId: "referred",
          stripeSubscriptionId: "bound",
        },
      ],
      billingSubscriptions: [
        {
          userId: "referred",
          stripeSubscriptionId: "bound",
          status: "incomplete",
        },
        { userId: "referred", stripeSubscriptionId: "other", status: "active" },
      ],
    })
    const result = await getCreatorMetricsPage._handler(ctx, {
      kind: "locks",
      paginationOpts,
    })
    expect(result.page).toEqual([
      { kind: "referral", key: "referred", paid: false },
    ])
  })
  it("preserves legacy conversion semantics with indexed status lookups", async () => {
    const ctx = context({
      creatorAttributions: [{ creatorAccountId: "creator", userId: "legacy" }],
      billingSubscriptions: [{ userId: "legacy", status: "canceled" }],
    })
    expect(
      (
        await getCreatorMetricsPage._handler(ctx, {
          kind: "attributions",
          paginationOpts,
        })
      ).page[0].paid
    ).toBe(true)
    expect(
      ctx.reads
        .filter((read) => read.table === "billingSubscriptions")
        .every((read) => read.index === "by_userId_status")
    ).toBe(true)
  })
  it("deduplicates referrals and keeps currencies separate", () => {
    expect(
      aggregateCreatorMetrics([
        { kind: "referral", key: "one", paid: false },
        { kind: "referral", key: "one", paid: true },
        { kind: "earning", currency: "usd", amount: 250 },
        { kind: "earning", currency: "gbp", amount: 100 },
      ])
    ).toEqual({
      signupCount: 1,
      paidConversionCount: 1,
      estimatedEarningsByCurrency: [
        { currency: "gbp", amount: 100 },
        { currency: "usd", amount: 250 },
      ],
    })
  })
  it("rejects anonymous access before database reads", async () => {
    const ctx = context({}, false)
    await expect(
      getCreatorMetricsPage._handler(ctx, { kind: "earnings", paginationOpts })
    ).rejects.toThrow("Sign in")
    expect(ctx.reads).toEqual([])
  })
})
