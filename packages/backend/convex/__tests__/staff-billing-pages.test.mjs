import { expect, it } from "bun:test"
import {
  getBillingSectionRecords,
  getBillingCreatorReferralCountPage,
} from "../queries/staff/internal.ts"
import { readCatalogBillingCounts } from "../../src/lib/staffBillingRecords.ts"

function context(tables) {
  const reads = []
  return {
    reads,
    db: {
      get: async (id) =>
        Object.values(tables)
          .flat()
          .find((row) => row._id === id) ?? null,
      query(table) {
        let rows = tables[table] ?? []
        const query = {
          withIndex(index, select) {
            reads.push({ table, index })
            select({
              eq(key, value) {
                rows = rows.filter((row) => row[key] === value)
                return this
              },
            })
            return query
          },
          order: () => query,
          first: async () => rows[0] ?? null,
          unique: async () => {
            if (rows.length > 1) throw new Error("duplicate")
            return rows[0] ?? null
          },
          take: async (count) => {
            reads.push({ table, count })
            return rows.slice(0, count)
          },
          paginate: async (options) => {
            reads.push({ table, options })
            const offset = Number(options.cursor ?? 0)
            const page = rows.slice(offset, offset + options.numItems)
            return {
              page,
              isDone: offset + page.length >= rows.length,
              continueCursor: String(offset + page.length),
            }
          },
          collect() {
            throw new Error("Unbounded read")
          },
        }
        return query
      },
    },
  }
}

it("pages subscriptions and joins only those accounts", async () => {
  const users = Array.from({ length: 60 }, (_, i) => ({ _id: `u${i}` }))
  const ctx = context({
    users,
    billingSubscriptions: users.map((user) => ({
      _id: `s${user._id}`,
      userId: user._id,
    })),
  })
  const first = await getBillingSectionRecords._handler(ctx, {
    scope: "subscriptions",
    cursor: null,
  })
  expect(first.users).toHaveLength(25)
  expect(first.primarySubscriptionIds).toHaveLength(25)
  expect(first.continueCursor).toBe("25")
  const second = await getBillingSectionRecords._handler(ctx, {
    scope: "subscriptions",
    cursor: first.continueCursor,
  })
  expect(second.users[0]._id).toBe("u25")
  expect(
    ctx.reads
      .filter((read) => read.options)
      .every((read) => read.options.maximumRowsRead === 25)
  ).toBe(true)
})

it("does not load account tables for catalog or payout sections", async () => {
  const ctx = {
    db: {
      query() {
        throw new Error("Account data not needed")
      },
    },
  }
  for (const scope of ["catalog", "creator-transfers"]) {
    const result = await getBillingSectionRecords._handler(ctx, {
      scope,
      cursor: null,
    })
    expect(result.users).toEqual([])
    expect(result.continueCursor).toBe(null)
  }
})

it("keeps unconfigured users available for creator onboarding", async () => {
  const ctx = context({ users: [{ _id: "new-user" }], creatorAccounts: [] })
  const result = await getBillingSectionRecords._handler(ctx, {
    scope: "creator-program",
    cursor: null,
  })
  expect(result.users[0]._id).toBe("new-user")
  expect(result.creatorAccounts).toEqual([])
})

it("rejects oversized related histories without returning partial financial state", async () => {
  const ctx = context({
    users: [{ _id: "u" }],
    billingSubscriptions: Array.from({ length: 101 }, (_, i) => ({
      _id: String(i),
      userId: "u",
    })),
  })
  await expect(
    getBillingSectionRecords._handler(ctx, {
      scope: "creator-access",
      cursor: null,
    })
  ).rejects.toThrow("No partial billing data")
})

it("deduplicates historical creator referrals across separate pages", async () => {
  const rows = Array.from({ length: 51 }, (_, i) => ({
    _id: `a${i}`,
    creatorAccountId: "creator",
    userId: i === 50 ? "u0" : `u${i}`,
  }))
  const ctx = context({
    creatorAttributions: rows,
    billingSubscriptions: [{ userId: "u0", status: "canceled" }],
  })
  const first = await getBillingCreatorReferralCountPage._handler(ctx, {
    creatorAccountId: "creator",
    paginationOpts: { cursor: null, numItems: 50 },
  })
  const last = await getBillingCreatorReferralCountPage._handler(ctx, {
    creatorAccountId: "creator",
    paginationOpts: { cursor: first.continueCursor, numItems: 50 },
  })
  expect(first.signupCount + last.signupCount).toBe(50)
  expect(first.paidConversionCount + last.paidConversionCount).toBe(1)
  expect(last.isDone).toBe(true)
})

it("reduces complete catalog counts without returning subscription history", async () => {
  const rows = Array.from({ length: 450 }, (_, i) => ({
    planKey: "premium",
    stripePriceId: i % 2 ? "year" : "month",
    status: i % 2 ? "canceled" : "active",
  }))
  const result = await readCatalogBillingCounts(
    {
      runQuery: async (_ref, { paginationOpts }) => {
        const offset = Number(paginationOpts.cursor ?? 0)
        const page = rows.slice(offset, offset + paginationOpts.numItems)
        return {
          page,
          isDone: offset + page.length >= rows.length,
          continueCursor: String(offset + page.length),
        }
      },
    },
    [{ key: "premium", monthlyPriceId: "month", yearlyPriceId: "year" }]
  )
  expect(result.activeSubscriptionCount).toBe(225)
  expect(result.counts.get("premium")).toEqual({
    activeSubscriptionCount: 225,
    currentMonthlySubscriptionCount: 225,
    currentYearlySubscriptionCount: 225,
  })
})
