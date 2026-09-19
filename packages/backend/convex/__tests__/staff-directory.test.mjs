import { describe, expect, it } from "bun:test"
import {
  getManagementRecords,
  getOpenSessionCountPage,
  getOverviewMetricsPage,
  getCreatorPayoutPreviewRecords,
} from "../queries/staff/internal.ts"

function context(users) {
  const reads = []
  return {
    reads,
    db: {
      query(table) {
        const filters = []
        const result = {
          withIndex(name, apply) {
            reads.push({ table, index: name })
            apply({
              eq(field, value) {
                filters.push([field, value])
                return this
              },
            })
            return result
          },
          order() {
            return result
          },
          async take(limit) {
            reads.push({ table, limit })
            return []
          },
          async unique() {
            return (
              users.find((user) =>
                filters.every(([key, value]) => user[key] === value)
              ) ?? null
            )
          },
          async paginate(options) {
            reads.push({ table, options })
            const offset = Number(options.cursor ?? 0)
            const scoped = users.filter(user => filters.every(([key, value]) => user[key] === value))
            const page = scoped.slice(offset, offset + options.numItems)
            return {
              page,
              isDone: offset + page.length >= scoped.length,
              continueCursor: String(offset + page.length),
            }
          },
          collect() {
            throw new Error("An unbounded directory read is forbidden")
          },
        }
        return result
      },
    },
  }
}

describe("staff directory reads", () => {
  it("pages local users without scanning all accounts", async () => {
    const ctx = context(
      Array.from({ length: 120 }, (_, i) => ({ clerkUserId: String(i) }))
    )
    const first = await getManagementRecords._handler(ctx, {})
    expect(first.users).toHaveLength(50)
    expect(first.continueCursor).toBe("50")
    const second = await getManagementRecords._handler(ctx, {
      cursor: first.continueCursor,
    })
    expect(second.users[0].clerkUserId).toBe("50")
    expect(ctx.reads.find((read) => read.options).options.maximumRowsRead).toBe(
      50
    )
  })
  it("uses exact Clerk IDs for the external directory page", async () => {
    const ctx = context([{ clerkUserId: "target" }, { clerkUserId: "other" }])
    const result = await getManagementRecords._handler(ctx, {
      clerkUserIds: ["target", "absent"],
    })
    expect(result.users).toEqual([{ clerkUserId: "target" }])
    expect(
      ctx.reads
        .filter((read) => read.table === "users")
        .every((read) => read.index === "by_clerkUserId")
    ).toBe(true)
  })
  it("rejects oversized lookup batches", async () => {
    await expect(
      getManagementRecords._handler(context([]), {
        clerkUserIds: Array(51).fill("id"),
      })
    ).rejects.toThrow("50 users")
  })
})

it("counts complete staff overview metrics across bounded pages", async () => {
  const ctx = context(
    Array.from({ length: 450 }, (_, i) => ({ role: i % 2 ? "staff" : "admin" }))
  )
  let cursor = null
  let total = 0
  let admins = 0
  do {
    const result = await getOverviewMetricsPage._handler(ctx, {
      kind: "users",
      paginationOpts: { cursor, numItems: 10000 },
    })
    total += result.totals.trackedUsers
    admins += result.totals.adminUsers
    cursor = result.isDone ? null : result.continueCursor
  } while (cursor)
  expect(total).toBe(450)
  expect(admins).toBe(225)
  expect(
    ctx.reads
      .filter((read) => read.options)
      .every((read) => read.options.numItems === 200)
  ).toBe(true)
})

it("preserves subscription attention and cancellation counting semantics", async () => {
  const ctx = context([
    { status: "active", cancelAtPeriodEnd: true },
    { status: "trialing", cancelAtPeriodEnd: false },
    { status: "past_due", cancelAtPeriodEnd: true },
    { status: "paused", cancelAtPeriodEnd: false },
    { status: "canceled", cancelAtPeriodEnd: true },
  ])
  const { totals } = await getOverviewMetricsPage._handler(ctx, {
    kind: "subscriptions",
    paginationOpts: { cursor: null, numItems: 200 },
  })
  expect(totals.activeSubscriptions).toBe(2)
  expect(totals.attentionSubscriptions).toBe(3)
  expect(totals.cancelAtPeriodEndCount).toBe(2)
})

it("loads only selected payout rows and their creator accounts", async () => {
  const reads = []
  const ctx = {
    db: {
      async get(id) {
        reads.push(id)
        return id === "ledger"
          ? { _id: id, creatorAccountId: "creator" }
          : { _id: id }
      },
      query() {
        throw new Error("Selected payout preview must not scan tables")
      },
    },
  }
  const result = await getCreatorPayoutPreviewRecords._handler(ctx, {
    ledgerEntryIds: ["ledger", "ledger"],
  })
  expect(reads).toEqual(["ledger", "creator"])
  expect(result.creatorEarningLedger).toHaveLength(1)
})

it("rejects oversized payout previews instead of returning truncated totals", async () => {
  const query = {
    withIndex(_name, apply) {
      apply({
        eq() {
          return this
        },
      })
      return this
    },
    async take(limit) {
      expect(limit).toBe(5001)
      return Array(5001).fill({})
    },
  }
  await expect(
    getCreatorPayoutPreviewRecords._handler({ db: { query: () => query } }, {})
  ).rejects.toThrow("Too many eligible ledger rows")
})

it("counts only open sessions across bounded index pages", async () => {
  const ctx = context([
    ...Array.from({ length: 250 }, () => ({ endedAt: null })),
    ...Array.from({ length: 30 }, () => ({ endedAt: 100 })),
  ])
  const first = await getOpenSessionCountPage._handler(ctx, { paginationOpts: { cursor: null, numItems: 999 } })
  const second = await getOpenSessionCountPage._handler(ctx, { paginationOpts: { cursor: first.continueCursor, numItems: 999 } })
  expect(first.count).toBe(200)
  expect(first.isDone).toBe(false)
  expect(second.count).toBe(50)
  expect(second.isDone).toBe(true)
  expect(ctx.reads.some(read => read.index === "by_endedAt")).toBe(true)
})