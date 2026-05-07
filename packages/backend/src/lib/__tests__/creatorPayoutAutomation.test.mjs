import { afterEach, describe, expect, it } from "bun:test"

import { runScheduledMonthlyCreatorPayoutTransfers } from "../../../convex/actions/creator/payouts.ts"
import { createCreatorPayoutRun } from "../../../convex/mutations/staff/payouts.ts"
import { resetConvexEnvForTests } from "../../env.ts"

const previousAutoTransfersEnabled = process.env.CREATOR_AUTO_TRANSFERS_ENABLED
const previousMaxTransferAmount =
  process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS

const INDEX_FIELDS = {
  creatorEarningLedger: {
    by_status: ["status"],
    by_status_invoiceIssuedAt: ["status", "invoiceIssuedAt"],
  },
  creatorPayoutRuns: {
    by_periodStart: ["periodStart"],
  },
  creatorPayoutTransfers: {
    by_payoutRunId: ["payoutRunId"],
  },
}

class FakeQuery {
  #db
  #filters = []
  #table

  constructor(db, table) {
    this.#db = db
    this.#table = table
  }

  withIndex(indexName, selector) {
    const indexFields = INDEX_FIELDS[this.#table]?.[indexName]

    if (!indexFields) {
      throw new Error(`unsupported_index:${this.#table}:${indexName}`)
    }

    if (!selector) {
      return this
    }

    const filters = []
    const builder = {
      eq(field, value) {
        filters.push({ field, op: "eq", value })
        return builder
      },
      gte(field, value) {
        filters.push({ field, op: "gte", value })
        return builder
      },
      lte(field, value) {
        filters.push({ field, op: "lte", value })
        return builder
      },
    }

    selector(builder)
    this.#filters = filters

    return this
  }

  async collect() {
    return this.#applyFilters()
  }

  order() {
    return this
  }

  async take(count) {
    return this.#applyFilters().slice(0, count)
  }

  #applyFilters() {
    return [...(this.#db.tables[this.#table] ?? [])].filter((doc) =>
      this.#filters.every(({ field, op, value }) => {
        if (op === "gte") return doc[field] >= value
        if (op === "lte") return doc[field] <= value
        return doc[field] === value
      })
    )
  }
}

class FakeDb {
  constructor(initialTables = {}) {
    this.idCounter = 0
    this.tables = {
      creatorAccounts: [creatorAccount()],
      creatorEarningLedger: [],
      creatorPayoutRuns: [],
      creatorPayoutTransfers: [],
      staffAuditLogs: [],
      ...initialTables,
    }
  }

  query(table) {
    return new FakeQuery(this, table)
  }

  async get(id) {
    for (const table of Object.values(this.tables)) {
      const found = table.find((doc) => doc._id === id)

      if (found) {
        return found
      }
    }

    return null
  }

  async insert(table, value) {
    this.idCounter += 1
    const doc = {
      _id: `${table}:${this.idCounter}`,
      ...value,
    }

    this.tables[table].push(doc)
    return doc._id
  }

  async patch(id, updates) {
    for (const table of Object.values(this.tables)) {
      const found = table.find((doc) => doc._id === id)

      if (found) {
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) {
            delete found[key]
          } else {
            found[key] = value
          }
        }
        return
      }
    }

    throw new Error(`missing_doc:${id}`)
  }
}

function creatorAccount(overrides = {}) {
  return {
    _id: "creatorAccounts:1",
    chargesEnabled: true,
    clerkUserId: "creator_clerk",
    code: "ALPHA",
    connectStatusUpdatedAt: Date.UTC(2026, 4, 1),
    detailsSubmitted: true,
    payoutEligible: true,
    payoutsEnabled: true,
    requirementsCurrentlyDue: [],
    requirementsDue: [],
    requirementsPastDue: [],
    stripeConnectedAccountId: "acct_ready",
    userId: "users:creator",
    ...overrides,
  }
}

function ledgerRow(overrides = {}) {
  return {
    _id: "creatorEarningLedger:1",
    creatorAccountId: "creatorAccounts:1",
    creatorCode: "ALPHA",
    currency: "GBP",
    earningAmount: 500,
    invoiceIssuedAt: Date.UTC(2026, 3, 15),
    status: "eligible",
    ...overrides,
  }
}

function createActionCtx(initialTables) {
  const db = new FakeDb(initialTables)

  return {
    db,
    async runMutation(_ref, args) {
      if (args.action) {
        return await db.insert("staffAuditLogs", {
          ...args,
          createdAt: Date.UTC(2026, 4, 1),
        })
      }

      return await createCreatorPayoutRun._handler({ db }, args)
    },
    async runQuery(_ref, args) {
      if (args.source === "scheduled") {
        const runs = await db
          .query("creatorPayoutRuns")
          .withIndex("by_periodStart", (query) =>
            query.eq("periodStart", args.periodStart)
          )
          .collect()

        return (
          runs.find(
            (run) =>
              run.source === "scheduled" &&
              run.status !== "canceled" &&
              run.status !== "cancelled"
          ) ?? null
        )
      }

      if (args.creatorPayoutPeriodStart !== undefined) {
        const ledgerRows = await db
          .query("creatorEarningLedger")
          .withIndex("by_status_invoiceIssuedAt", (query) =>
            query
              .eq("status", "eligible")
              .gte("invoiceIssuedAt", args.creatorPayoutPeriodStart)
              .lte("invoiceIssuedAt", args.creatorPayoutPeriodEnd)
          )
          .take(5000)

        return {
          creatorAccounts: db.tables.creatorAccounts,
          creatorEarningLedger: ledgerRows,
        }
      }

      throw new Error("unexpected query")
    },
  }
}

afterEach(() => {
  if (previousAutoTransfersEnabled === undefined) {
    delete process.env.CREATOR_AUTO_TRANSFERS_ENABLED
  } else {
    process.env.CREATOR_AUTO_TRANSFERS_ENABLED = previousAutoTransfersEnabled
  }

  if (previousMaxTransferAmount === undefined) {
    delete process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS
  } else {
    process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS =
      previousMaxTransferAmount
  }

  resetConvexEnvForTests()
})

describe("scheduled creator payout automation", () => {
  it("dry-runs the previous completed period without reserving rows", async () => {
    process.env.CREATOR_AUTO_TRANSFERS_ENABLED = "true"
    resetConvexEnvForTests()
    const ctx = createActionCtx({
      creatorEarningLedger: [
        ledgerRow(),
        ledgerRow({
          _id: "creatorEarningLedger:2",
          invoiceIssuedAt: Date.UTC(2026, 4, 1),
        }),
      ],
    })

    const result = await runScheduledMonthlyCreatorPayoutTransfers._handler(ctx, {
      dryRun: true,
      now: Date.UTC(2026, 4, 7),
    })

    expect(result.period).toEqual({
      periodEnd: Date.UTC(2026, 4, 1) - 1,
      periodStart: Date.UTC(2026, 3, 1),
    })
    expect(result.preview.transferCount).toBe(1)
    expect(ctx.db.tables.creatorPayoutRuns).toHaveLength(0)
    expect(ctx.db.tables.creatorEarningLedger[0].status).toBe("eligible")
  })

  it("creates a scheduled review run but does not execute transfers when disabled", async () => {
    process.env.CREATOR_AUTO_TRANSFERS_ENABLED = "false"
    resetConvexEnvForTests()
    const ctx = createActionCtx({
      creatorEarningLedger: [ledgerRow()],
    })

    const result = await runScheduledMonthlyCreatorPayoutTransfers._handler(ctx, {
      now: Date.UTC(2026, 4, 7),
    })

    expect(result.automaticTransfersEnabled).toBe(false)
    expect(ctx.db.tables.creatorPayoutRuns[0]).toMatchObject({
      createdBySystem: true,
      periodStart: Date.UTC(2026, 3, 1),
      source: "scheduled",
      status: "draft",
    })
    expect(ctx.db.tables.creatorPayoutTransfers[0]).toMatchObject({
      source: "scheduled",
      status: "draft",
      stripeTransferId: undefined,
    })
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      status: "reserved",
      transferStatus: "draft",
    })
  })
})
