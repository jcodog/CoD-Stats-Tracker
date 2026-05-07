import { describe, expect, it } from "bun:test"

import { executeCreatorPayoutTransfer } from "../../../convex/actions/creator/payoutExecution.ts"
import {
  createCreatorPayoutRun,
  markCreatorPayoutTransferExecuting,
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
      creatorAccounts: [],
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

      if (found) return found
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
      if (args.allowedStatuses) {
        return await markCreatorPayoutTransferExecuting._handler({ db }, args)
      }

      if (args.stripeTransferId) {
        return await markCreatorPayoutTransferSucceeded._handler({ db }, args)
      }

      throw new Error("unexpected mutation")
    },
    async runQuery(_ref, args) {
      if (args.creatorAccountId) {
        return await db.get(args.creatorAccountId)
      }

      throw new Error("unexpected query")
    },
  }
}

function createReadyConnectSnapshot(account) {
  return {
    chargesEnabled: true,
    connectStatusUpdatedAt: Date.now(),
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

describe("creator payout transfer action execution", () => {
  it("creates one Stripe transfer per creator and currency", async () => {
    const mutationCtx = {
      db: new FakeDb({
        creatorAccounts: [creatorAccount()],
        creatorEarningLedger: [
          ledgerRow({ _id: "ledger:1", currency: "GBP", earningAmount: 500 }),
          ledgerRow({ _id: "ledger:2", currency: "GBP", earningAmount: 700 }),
          ledgerRow({ _id: "ledger:3", currency: "USD", earningAmount: 300 }),
        ],
      }),
    }
    const run = await createCreatorPayoutRun._handler(mutationCtx, {
      createdByClerkUserId: "staff_1",
      createdByName: "Staff One",
      source: "dry_run_review",
    })
    const actionCtx = createActionCtx(mutationCtx.db.tables)
    const calls = []
    const stripe = {
      transfers: {
        create(params, options) {
          calls.push({ options, params })
          return { id: `tr_${calls.length}` }
        },
      },
    }

    for (const transfer of actionCtx.db.tables.creatorPayoutTransfers) {
      await executeCreatorPayoutTransfer({
        allowedStatuses: ["draft"],
        ctx: actionCtx,
        stripe,
        syncConnectAccount: async () =>
          createReadyConnectSnapshot(actionCtx.db.tables.creatorAccounts[0]),
        transfer,
      })
    }

    expect(run.transferCount).toBe(2)
    expect(calls).toHaveLength(2)
    expect(calls.map((call) => call.params)).toEqual([
      expect.objectContaining({
        amount: 1200,
        currency: "gbp",
        destination: "acct_ready",
      }),
      expect.objectContaining({
        amount: 300,
        currency: "usd",
        destination: "acct_ready",
      }),
    ])
    expect(calls[0].params.metadata).toMatchObject({
      app: "cod-stats-tracker",
      creatorAccountId: "creatorAccounts:1",
      creatorCode: "ALPHA",
      ledgerEntryCount: "2",
      payoutRunId: run.payoutRunId,
      payoutTransferId: actionCtx.db.tables.creatorPayoutTransfers[0]._id,
    })
    expect(calls[0].options.idempotencyKey).toContain(
      actionCtx.db.tables.creatorPayoutTransfers[0]._id
    )
    expect(actionCtx.db.tables.creatorEarningLedger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "transferred",
          stripeTransferId: "tr_1",
          transferStatus: "transferred",
        }),
      ])
    )
  })

  it("does not call Stripe again for a successful transfer retry", async () => {
    const mutationCtx = {
      db: new FakeDb({
        creatorAccounts: [creatorAccount()],
        creatorEarningLedger: [ledgerRow()],
      }),
    }
    await createCreatorPayoutRun._handler(mutationCtx, {
      createdByClerkUserId: "staff_1",
      createdByName: "Staff One",
      source: "dry_run_review",
    })
    const actionCtx = createActionCtx(mutationCtx.db.tables)
    const transfer = actionCtx.db.tables.creatorPayoutTransfers[0]
    let callCount = 0
    const stripe = {
      transfers: {
        create() {
          callCount += 1
          return { id: "tr_once" }
        },
      },
    }

    await executeCreatorPayoutTransfer({
      allowedStatuses: ["draft"],
      ctx: actionCtx,
      stripe,
      syncConnectAccount: async () =>
        createReadyConnectSnapshot(actionCtx.db.tables.creatorAccounts[0]),
      transfer,
    })

    await expect(
      executeCreatorPayoutTransfer({
        allowedStatuses: ["requires_review"],
        ctx: actionCtx,
        stripe,
        syncConnectAccount: async () =>
          createReadyConnectSnapshot(actionCtx.db.tables.creatorAccounts[0]),
        transfer,
      })
    ).rejects.toThrow("already succeeded")
    expect(callCount).toBe(1)
  })
})
