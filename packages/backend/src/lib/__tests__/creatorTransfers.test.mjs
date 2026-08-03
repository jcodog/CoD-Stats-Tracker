import { describe, expect, it } from "bun:test"

import {
  buildCreatorPayoutPreview,
  buildCreatorPayoutTransferGroup,
  buildCreatorPayoutTransferIdempotencyKey,
  createCreatorStripeTransfer,
  getAvailablePlatformBalanceForCurrency,
  getPreviousCompletedMonthlyPayoutPeriod,
} from "../creator/payouts/transfers.ts"
import {
  cancelCreatorPayoutRun,
  createCreatorPayoutRun,
  markCreatorPayoutTransferExecuting,
  markCreatorPayoutTransferFailed,
  markCreatorPayoutTransferSucceeded,
} from "../../../convex/mutations/staff/payouts.ts"

const INDEX_FIELDS = {
  creatorEarningLedger: {
    by_status: ["status"],
    by_status_invoiceIssuedAt: ["status", "invoiceIssuedAt"],
  },
  creatorPayoutTransfers: {
    by_payoutRunId: ["payoutRunId"],
  },
}

class FakeQuery {
  #db
  #filters = []
  #order = "asc"
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

    const filters = []
    const builder = {
      eq(field, value) {
        if (!indexFields.includes(field)) {
          throw new Error(`unsupported_index_field:${indexName}:${field}`)
        }

        filters.push({ field, value })
        return builder
      },
      gte(field, value) {
        if (!indexFields.includes(field)) {
          throw new Error(`unsupported_index_field:${indexName}:${field}`)
        }

        filters.push({ field, op: "gte", value })
        return builder
      },
      lte(field, value) {
        if (!indexFields.includes(field)) {
          throw new Error(`unsupported_index_field:${indexName}:${field}`)
        }

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

  order(direction) {
    this.#order = direction
    return this
  }

  async take(count) {
    return this.#applyFilters().slice(0, count)
  }

  #applyFilters() {
    const rows = [...(this.#db.tables[this.#table] ?? [])].filter((doc) =>
      this.#filters.every(({ field, op, value }) => {
        if (op === "gte") {
          return doc[field] >= value
        }

        if (op === "lte") {
          return doc[field] <= value
        }

        return doc[field] === value
      })
    )

    return this.#order === "desc" ? rows.reverse() : rows
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

function createCtx(initialTables) {
  return {
    db: new FakeDb(initialTables),
  }
}

function creatorAccount(overrides = {}) {
  return {
    _id: "creatorAccounts:1",
    chargesEnabled: true,
    clerkUserId: "creator_clerk",
    code: "ALPHA",
    connectStatusUpdatedAt: Date.now(),
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
    currency: "gbp",
    earningAmount: 500,
    invoiceIssuedAt: Date.UTC(2026, 1, 1),
    status: "eligible",
    ...overrides,
  }
}

async function createRun(ctx) {
  return await createCreatorPayoutRun._handler(ctx, {
    createdByClerkUserId: "staff_1",
    createdByName: "Staff One",
  })
}

describe("creator transfer preview", () => {
  it("selects the previous completed monthly payout period", () => {
    expect(
      getPreviousCompletedMonthlyPayoutPeriod(Date.UTC(2026, 4, 7, 12))
    ).toEqual({
      periodEnd: Date.UTC(2026, 4, 1) - 1,
      periodStart: Date.UTC(2026, 3, 1),
    })
  })

  it("groups eligible rows by creator and currency", () => {
    const preview = buildCreatorPayoutPreview({
      creatorAccounts: [
        creatorAccount(),
        creatorAccount({
          _id: "creatorAccounts:2",
          code: "BETA",
          stripeConnectedAccountId: "acct_beta",
        }),
      ],
      ledgerRows: [
        ledgerRow({ _id: "ledger:1", earningAmount: 500 }),
        ledgerRow({ _id: "ledger:2", earningAmount: 700 }),
        ledgerRow({ _id: "ledger:3", currency: "usd", earningAmount: 300 }),
        ledgerRow({
          _id: "ledger:4",
          creatorAccountId: "creatorAccounts:2",
          creatorCode: "BETA",
          earningAmount: 900,
        }),
      ],
    })

    expect(preview.readyGroups).toHaveLength(3)
    expect(preview.readyGroups[0]).toMatchObject({
      amount: 1200,
      creatorCode: "ALPHA",
      currency: "gbp",
      ledgerEntryCount: 2,
    })
    expect(preview.currencyTotals).toEqual([
      { amount: 2100, currency: "gbp" },
      { amount: 300, currency: "usd" },
    ])
  })

  it("excludes ineligible, reversed, reserved, and transferred rows", () => {
    const preview = buildCreatorPayoutPreview({
      creatorAccounts: [creatorAccount()],
      ledgerRows: [
        ledgerRow({ _id: "ledger:1", status: "pending" }),
        ledgerRow({ _id: "ledger:2", status: "void" }),
        ledgerRow({ _id: "ledger:3", status: "reversed" }),
        ledgerRow({ _id: "ledger:4", status: "reserved" }),
        ledgerRow({
          _id: "ledger:5",
          status: "eligible",
          stripeTransferId: "tr_1",
        }),
      ],
    })

    expect(preview.readyGroups).toHaveLength(0)
    expect(preview.excludedCount).toBe(5)
  })

  it("blocks missing, payout-paused, and non-ready Connect accounts", () => {
    const missing = buildCreatorPayoutPreview({
      creatorAccounts: [],
      ledgerRows: [ledgerRow()],
    })
    const noStripe = buildCreatorPayoutPreview({
      creatorAccounts: [creatorAccount({ stripeConnectedAccountId: undefined })],
      ledgerRows: [ledgerRow()],
    })
    const paused = buildCreatorPayoutPreview({
      creatorAccounts: [creatorAccount({ payoutEligible: false })],
      ledgerRows: [ledgerRow()],
    })
    const notReady = buildCreatorPayoutPreview({
      creatorAccounts: [
        creatorAccount({
          chargesEnabled: false,
          payoutsEnabled: false,
          requirementsDue: ["external_account"],
        }),
      ],
      ledgerRows: [ledgerRow()],
    })

    expect(missing.blockedGroups[0].blockers[0].code).toBe(
      "missing_creator_account"
    )
    expect(noStripe.blockedGroups[0].blockers[0].code).toBe(
      "missing_connect_account"
    )
    expect(paused.blockedGroups[0].blockers[0].code).toBe(
      "payout_eligibility_paused"
    )
    expect(
      notReady.blockedGroups[0].blockers.map((blocker) => blocker.code)
    ).toEqual([
      "connect_requirements_due",
      "payouts_not_enabled",
      "stripe_transfer_capability_inactive",
    ])
  })

  it("blocks stale Connect readiness snapshots", () => {
    const preview = buildCreatorPayoutPreview({
      creatorAccounts: [
        creatorAccount({
          connectStatusUpdatedAt: Date.UTC(2026, 0, 1),
        }),
      ],
      ledgerRows: [ledgerRow()],
      now: Date.UTC(2026, 0, 20),
    })

    expect(preview.blockedGroups[0].blockers[0].code).toBe(
      "connect_status_stale"
    )
  })

  it("builds stable transfer idempotency keys", () => {
    expect(
      buildCreatorPayoutTransferIdempotencyKey({
        payoutTransferId: "creatorPayoutTransfers:1",
      })
    ).toBe("cod-stats-tracker:creator-transfer:creatorPayoutTransfers:1")
  })

  it("builds a stable transfer group for a payout run", () => {
    expect(
      buildCreatorPayoutTransferGroup({ payoutRunId: "creatorPayoutRuns:1" })
    ).toBe("cod-stats-tracker:creator-payout-run:creatorPayoutRuns:1")
  })

  it("reads the available platform balance for the transfer currency", async () => {
    const available = await getAvailablePlatformBalanceForCurrency({
      currency: "GBP",
      stripe: {
        balance: {
          retrieve: async () => ({
            available: [
              { amount: 500, currency: "usd" },
              { amount: 1234, currency: "gbp" },
            ],
          }),
        },
        transfers: { create: async () => ({ id: "unused" }) },
      },
    })

    expect(available).toBe(1234)
  })

  it("creates Stripe transfers with strict transfer parameters", async () => {
    const calls = []
    const stripeTransfer = await createCreatorStripeTransfer({
      amount: 1234,
      creatorAccountId: "creatorAccounts:1",
      creatorCode: "ALPHA",
      currency: "GBP",
      idempotencyKey: "creator-transfer-key",
      ledgerEntryCount: 3,
      payoutRunId: "creatorPayoutRuns:1",
      payoutTransferId: "creatorPayoutTransfers:1",
      stripe: {
        balance: {
          retrieve: async () => ({ available: [] }),
        },
        transfers: {
          create(params, options) {
            calls.push({ options, params })
            return { id: "tr_123" }
          },
        },
      },
      stripeConnectedAccountId: "acct_ready",
    })

    expect(stripeTransfer.id).toBe("tr_123")
    expect(calls).toEqual([
      {
        options: { idempotencyKey: "creator-transfer-key" },
        params: {
          amount: 1234,
          currency: "gbp",
          destination: "acct_ready",
          metadata: {
            app: "cod-stats-tracker",
            creatorAccountId: "creatorAccounts:1",
            creatorCode: "ALPHA",
            ledgerEntryCount: "3",
            payoutRunId: "creatorPayoutRuns:1",
            payoutTransferId: "creatorPayoutTransfers:1",
          },
          transfer_group:
            "cod-stats-tracker:creator-payout-run:creatorPayoutRuns:1",
        },
      },
    ])
  })
})

describe("creator payout run mutations", () => {
  it("freezes rows and prevents the same row entering two active runs", async () => {
    const ctx = createCtx({
      creatorEarningLedger: [ledgerRow()],
    })
    const run = await createRun(ctx)

    expect(run.transferCount).toBe(1)
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      payoutRunId: run.payoutRunId,
      status: "reserved",
      transferStatus: "draft",
    })
    expect(
      ctx.db.tables.creatorPayoutTransfers[0].idempotencyKey
    ).toContain(ctx.db.tables.creatorPayoutTransfers[0]._id)

    await expect(createRun(ctx)).rejects.toThrow(
      "No eligible creator earnings are ready to transfer."
    )
  })

  it("marks success with the Stripe transfer ID and locks ledger rows", async () => {
    const ctx = createCtx({
      creatorEarningLedger: [ledgerRow()],
    })
    await createRun(ctx)
    const transfer = ctx.db.tables.creatorPayoutTransfers[0]

    await markCreatorPayoutTransferExecuting._handler(ctx, {
      allowedStatuses: ["draft"],
      payoutTransferId: transfer._id,
    })
    await markCreatorPayoutTransferSucceeded._handler(ctx, {
      payoutTransferId: transfer._id,
      stripeTransferId: "tr_1",
      transferredAt: Date.UTC(2026, 2, 1),
    })

    expect(ctx.db.tables.creatorPayoutTransfers[0]).toMatchObject({
      status: "transferred",
      stripeTransferId: "tr_1",
    })
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      status: "transferred",
      stripeTransferId: "tr_1",
      transferStatus: "transferred",
    })
    expect(ctx.db.tables.creatorPayoutRuns[0].status).toBe("completed")
  })

  it("preserves retry path on failure and blocks retry after success", async () => {
    const ctx = createCtx({
      creatorEarningLedger: [ledgerRow()],
    })
    await createRun(ctx)
    const transfer = ctx.db.tables.creatorPayoutTransfers[0]

    await markCreatorPayoutTransferExecuting._handler(ctx, {
      allowedStatuses: ["draft"],
      payoutTransferId: transfer._id,
    })
    await markCreatorPayoutTransferFailed._handler(ctx, {
      failureCode: "balance_insufficient",
      failureMessage: "Insufficient Funds",
      payoutTransferId: transfer._id,
      status: "requires_review",
    })

    expect(ctx.db.tables.creatorPayoutTransfers[0]).toMatchObject({
      failureCode: "balance_insufficient",
      status: "requires_review",
    })
    expect(ctx.db.tables.creatorEarningLedger[0].status).toBe(
      "transfer_requires_review"
    )

    await markCreatorPayoutTransferExecuting._handler(ctx, {
      allowedStatuses: ["requires_review"],
      payoutTransferId: transfer._id,
    })
    await markCreatorPayoutTransferSucceeded._handler(ctx, {
      payoutTransferId: transfer._id,
      stripeTransferId: "tr_retry",
      transferredAt: Date.UTC(2026, 2, 2),
    })

    await expect(
      markCreatorPayoutTransferExecuting._handler(ctx, {
        allowedStatuses: ["requires_review"],
        payoutTransferId: transfer._id,
      })
    ).rejects.toThrow("already succeeded")
  })

  it("cancels draft runs and releases reserved ledger rows", async () => {
    const ctx = createCtx({
      creatorEarningLedger: [ledgerRow()],
    })
    const run = await createRun(ctx)

    await cancelCreatorPayoutRun._handler(ctx, {
      payoutRunId: run.payoutRunId,
    })

    expect(ctx.db.tables.creatorPayoutRuns[0].status).toBe("canceled")
    expect(ctx.db.tables.creatorPayoutTransfers[0].status).toBe("cancelled")
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      status: "eligible",
    })
    expect(ctx.db.tables.creatorEarningLedger[0].payoutTransferId).toBe(
      undefined
    )
  })
})
