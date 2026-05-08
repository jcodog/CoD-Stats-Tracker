import { afterEach, describe, expect, it } from "bun:test"

import { executeCreatorPayoutTransfer } from "../../../convex/actions/creator/payouts/execution.ts"
import {
  runScheduledMonthlyCreatorPayoutTransfers,
  runScheduledMonthlyCreatorPayoutTransfersHandler,
} from "../../../convex/actions/creator/payouts/scheduled.ts"
import {
  createCreatorPayoutRun,
  markCreatorPayoutTransferExecuting,
  markCreatorPayoutTransferFailed,
  markCreatorPayoutTransferSucceeded,
} from "../../../convex/mutations/staff/payouts.ts"
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

      if (args.allowedStatuses) {
        return await markCreatorPayoutTransferExecuting._handler({ db }, args)
      }

      if (args.stripeTransferId) {
        return await markCreatorPayoutTransferSucceeded._handler({ db }, args)
      }

      if (args.status) {
        return await markCreatorPayoutTransferFailed._handler({ db }, args)
      }

      return await createCreatorPayoutRun._handler({ db }, args)
    },
    async runQuery(_ref, args) {
      if (args.source === "scheduled" && args.periodStart !== undefined) {
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

      if (args.payoutRunId) {
        return await db
          .query("creatorPayoutTransfers")
          .withIndex("by_payoutRunId", (query) =>
            query.eq("payoutRunId", args.payoutRunId)
          )
          .collect()
      }

      if (args.creatorAccountId) {
        return await db.get(args.creatorAccountId)
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

function createReadyConnectSnapshot(account) {
  return {
    chargesEnabled: true,
    connectStatusUpdatedAt: Date.UTC(2026, 4, 1),
    detailsSubmitted: true,
    payoutsEnabled: true,
    requirementsCurrentlyDue: [],
    requirementsDisabledReason: undefined,
    requirementsDue: [],
    requirementsPastDue: [],
    requirementsPendingVerification: [],
    stripeConnectedAccountId: account.stripeConnectedAccountId,
    stripeConnectedAccountVersion: "v2",
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
    delete process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS
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
    delete process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS
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

  it("creates and executes a clean scheduled transfer when automatic transfers are enabled", async () => {
    process.env.CREATOR_AUTO_TRANSFERS_ENABLED = "true"
    delete process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS
    resetConvexEnvForTests()
    const ctx = createActionCtx({
      creatorEarningLedger: [ledgerRow()],
    })
    const stripeCalls = []
    const stripe = {
      transfers: {
        create(params, options) {
          stripeCalls.push({ options, params })
          return { id: "tr_scheduled_1" }
        },
      },
    }

    const result = await runScheduledMonthlyCreatorPayoutTransfersHandler(
      ctx,
      {
        now: Date.UTC(2026, 4, 7),
      },
      {
        executeTransfer: (transferArgs) =>
          executeCreatorPayoutTransfer({
            ...transferArgs,
            stripe,
            syncConnectAccount: async () =>
              createReadyConnectSnapshot(ctx.db.tables.creatorAccounts[0]),
          }),
      }
    )

    expect(result.period).toEqual({
      periodEnd: Date.UTC(2026, 4, 1) - 1,
      periodStart: Date.UTC(2026, 3, 1),
    })
    expect(result.transferredCount).toBe(1)
    expect(ctx.db.tables.creatorPayoutRuns[0]).toMatchObject({
      createdBySystem: true,
      periodStart: Date.UTC(2026, 3, 1),
      source: "scheduled",
      status: "completed",
    })
    expect(stripeCalls).toHaveLength(1)
    expect(stripeCalls[0].params).toMatchObject({
      amount: 500,
      currency: "gbp",
      destination: "acct_ready",
      metadata: expect.objectContaining({
        app: "cod-stats-tracker",
        creatorAccountId: "creatorAccounts:1",
        creatorCode: "ALPHA",
        ledgerEntryCount: "1",
        payoutRunId: ctx.db.tables.creatorPayoutRuns[0]._id,
        payoutTransferId: ctx.db.tables.creatorPayoutTransfers[0]._id,
      }),
    })
    expect(stripeCalls[0].options.idempotencyKey).toContain(
      ctx.db.tables.creatorPayoutTransfers[0]._id
    )
    expect(ctx.db.tables.creatorPayoutTransfers[0]).toMatchObject({
      source: "scheduled",
      status: "transferred",
      stripeTransferId: "tr_scheduled_1",
    })
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      status: "transferred",
      stripeTransferId: "tr_scheduled_1",
      transferStatus: "transferred",
    })
    expect(ctx.db.tables.staffAuditLogs.map((log) => log.action)).toEqual([
      "billing.creator_transfers.scheduled_run_created",
      "billing.creator_transfers.scheduled_run_executed",
    ])
  })

  it("marks oversized scheduled transfers for review without calling Stripe", async () => {
    process.env.CREATOR_AUTO_TRANSFERS_ENABLED = "true"
    process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS = "400"
    resetConvexEnvForTests()
    const ctx = createActionCtx({
      creatorEarningLedger: [ledgerRow()],
    })
    let stripeCallCount = 0
    const stripe = {
      transfers: {
        create() {
          stripeCallCount += 1
          return { id: "tr_should_not_exist" }
        },
      },
    }

    const result = await runScheduledMonthlyCreatorPayoutTransfersHandler(
      ctx,
      {
        now: Date.UTC(2026, 4, 7),
      },
      {
        executeTransfer: (transferArgs) =>
          executeCreatorPayoutTransfer({
            ...transferArgs,
            stripe,
            syncConnectAccount: async () => {
              throw new Error("connect readiness should not be refreshed")
            },
          }),
      }
    )

    expect(result.transferredCount).toBe(0)
    expect(result.reviewCount).toBe(1)
    expect(stripeCallCount).toBe(0)
    expect(ctx.db.tables.creatorPayoutTransfers[0]).toMatchObject({
      failureCode: "max_transfer_amount_exceeded",
      status: "requires_review",
      stripeTransferId: undefined,
    })
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      status: "transfer_requires_review",
      transferStatus: "requires_review",
    })
  })

  it("does not create a duplicate scheduled run for a period with an active scheduled run", async () => {
    process.env.CREATOR_AUTO_TRANSFERS_ENABLED = "true"
    delete process.env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS
    resetConvexEnvForTests()
    const existingRun = {
      _id: "creatorPayoutRuns:existing",
      createdAt: Date.UTC(2026, 4, 1),
      createdByClerkUserId: "system:creator-monthly-payout-cron",
      createdByName: "Creator payout schedule",
      periodEnd: Date.UTC(2026, 4, 1) - 1,
      periodStart: Date.UTC(2026, 3, 1),
      source: "scheduled",
      status: "requires_review",
      updatedAt: Date.UTC(2026, 4, 1),
    }
    const ctx = createActionCtx({
      creatorEarningLedger: [ledgerRow()],
      creatorPayoutRuns: [existingRun],
    })

    const result = await runScheduledMonthlyCreatorPayoutTransfersHandler(ctx, {
      now: Date.UTC(2026, 4, 7),
    })

    expect(result.existingRunId).toBe(existingRun._id)
    expect(result.summary).toContain("staff review and retry")
    expect(ctx.db.tables.creatorPayoutRuns).toHaveLength(1)
    expect(ctx.db.tables.creatorPayoutTransfers).toHaveLength(0)
    expect(ctx.db.tables.staffAuditLogs).toHaveLength(0)
  })
})
