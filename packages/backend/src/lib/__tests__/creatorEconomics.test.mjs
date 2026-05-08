import { describe, expect, it } from "bun:test"

import {
  calculateCreatorPayoutEligibilityEndsAt,
  isSelfCreatorCode,
} from "../creator/accounting.ts"
import {
  createHostedSubscriptionCheckoutSession,
  shouldBlockNewCheckout,
} from "../../../convex/lib/stripe/helpers/checkout.ts"
import { buildCreatorDiscountCouponCreateParams } from "../../../convex/lib/stripe/helpers/creatorDiscounts.ts"
import { syncBillingInvoices } from "../../../convex/mutations/billing/state.ts"
import {
  bindUsageLockToSubscription,
  ensureCreatorCodeUsageLock,
} from "../../../convex/mutations/creator/attribution/lifecycle.ts"
import { getEstimatedPayoutPresentation } from "../../../../../apps/web/src/features/creator-panel/lib/creator-panel.ts"

const INDEX_FIELDS = {
  billingInvoices: {
    by_userId: ["userId"],
  },
  creatorAccounts: {
    by_normalizedCode: ["normalizedCode"],
  },
  creatorCodeUsageLocks: {
    by_creatorAccountId: ["creatorAccountId"],
    by_stripeSubscriptionId: ["stripeSubscriptionId"],
    by_userId: ["userId"],
  },
  creatorEarningLedger: {
    by_idempotencyKey: ["idempotencyKey"],
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

        filters.push({ field, value })
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

  async unique() {
    const matches = this.#applyFilters()

    if (matches.length > 1) {
      throw new Error(`expected_unique_result:${this.#table}`)
    }

    return matches[0] ?? null
  }

  #applyFilters() {
    return [...(this.#db.tables[this.#table] ?? [])].filter((doc) =>
      this.#filters.every(({ field, value }) => doc[field] === value)
    )
  }
}

class FakeDb {
  constructor(initialTables = {}) {
    this.idCounter = 0
    this.tables = {
      billingInvoices: [],
      creatorAccounts: [createCreatorAccount()],
      creatorCodeUsageLocks: [],
      creatorEarningLedger: [],
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
        Object.assign(found, updates)
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

function createCreatorAccount(overrides = {}) {
  return {
    _id: "creatorAccounts:1",
    clerkUserId: "creator_clerk",
    code: "ALPHA",
    codeActive: true,
    country: "GB",
    createdAt: 0,
    creatorAccountId: "creatorAccounts:1",
    discountPercent: 10,
    normalizedCode: "ALPHA",
    payoutEligible: true,
    payoutPercent: 20,
    updatedAt: 0,
    userId: "users:creator",
    ...overrides,
  }
}

function usageLock(overrides = {}) {
  const attributionStartedAt = Date.UTC(2026, 0, 1)

  return {
    _id: "creatorCodeUsageLocks:1",
    attributionStartedAt,
    clerkUserId: "subscriber_clerk",
    createdAt: 1,
    creatorAccountId: "creatorAccounts:1",
    creatorCode: "ALPHA",
    discountAppliedAt: attributionStartedAt,
    discountPercent: 10,
    normalizedCode: "ALPHA",
    payoutEligibilityEndsAt:
      calculateCreatorPayoutEligibilityEndsAt(attributionStartedAt),
    payoutPercent: 20,
    source: "manual",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    subscriptionBoundAt: attributionStartedAt,
    updatedAt: 1,
    userId: "users:subscriber",
    ...overrides,
  }
}

function invoice(overrides = {}) {
  return {
    amountDue: 1000,
    amountPaid: 1000,
    amountTotal: 1000,
    currency: "gbp",
    description: "Subscription invoice",
    invoiceIssuedAt: Date.UTC(2026, 1, 1),
    status: "paid",
    stripeInvoiceId: "in_1",
    stripePaymentIntentId: "pi_1",
    stripeSubscriptionId: "sub_1",
    ...overrides,
  }
}

const lockArgs = {
  clerkUserId: "subscriber_clerk",
  creatorAccountId: "creatorAccounts:1",
  creatorCode: "ALPHA",
  discountAppliedAt: 1_000,
  discountPercent: 10,
  normalizedCode: "ALPHA",
  payoutPercent: 20,
  source: "manual",
  stripeCustomerId: "cus_1",
  userId: "users:subscriber",
}

describe("creator code usage locks", () => {
  it("lets a user use a creator code once", async () => {
    const ctx = createCtx()

    const first = await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)
    const second = await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)

    expect(first.status).toBe("locked")
    expect(second.status).toBe("confirmed_existing")
    expect(ctx.db.tables.creatorCodeUsageLocks).toHaveLength(1)
  })

  it("rejects a different creator code later", async () => {
    const ctx = createCtx()

    await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)
    const result = await ensureCreatorCodeUsageLock._handler(ctx, {
      ...lockArgs,
      creatorAccountId: "creatorAccounts:2",
      creatorCode: "BETA",
      normalizedCode: "BETA",
    })

    expect(result.status).toBe("conflict_locked")
    expect(result.existingCode).toBe("ALPHA")
  })

  it("does not allow another creator code on a future subscription", async () => {
    const ctx = createCtx()
    const initial = await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)

    await bindUsageLockToSubscription._handler(ctx, {
      clerkUserId: lockArgs.clerkUserId,
      creatorCode: lockArgs.creatorCode,
      creatorUsageLockId: initial.usageLockId,
      normalizedCode: lockArgs.normalizedCode,
      source: "manual",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      subscriptionStartedAt: Date.UTC(2026, 0, 1),
      userId: lockArgs.userId,
    })

    const sameCode = await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)
    const differentCode = await ensureCreatorCodeUsageLock._handler(ctx, {
      ...lockArgs,
      creatorAccountId: "creatorAccounts:2",
      creatorCode: "BETA",
      normalizedCode: "BETA",
    })

    expect(sameCode.status).toBe("already_used")
    expect(differentCode.status).toBe("conflict_locked")
  })

  it("prevents applying your own creator code", () => {
    expect(
      isSelfCreatorCode({
        creatorUserId: "users:creator",
        userId: "users:creator",
      })
    ).toBe(true)
  })

  it("binds attribution to one Stripe subscription", async () => {
    const ctx = createCtx()
    const initial = await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)
    const firstBind = await bindUsageLockToSubscription._handler(ctx, {
      clerkUserId: lockArgs.clerkUserId,
      creatorCode: lockArgs.creatorCode,
      creatorUsageLockId: initial.usageLockId,
      normalizedCode: lockArgs.normalizedCode,
      source: "manual",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      subscriptionStartedAt: Date.UTC(2026, 0, 1),
      userId: lockArgs.userId,
    })
    const secondBind = await bindUsageLockToSubscription._handler(ctx, {
      clerkUserId: lockArgs.clerkUserId,
      creatorCode: lockArgs.creatorCode,
      creatorUsageLockId: initial.usageLockId,
      normalizedCode: lockArgs.normalizedCode,
      source: "manual",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_2",
      subscriptionStartedAt: Date.UTC(2026, 0, 1),
      userId: lockArgs.userId,
    })

    expect(firstBind.status).toBe("bound")
    expect(secondBind.status).toBe("subscription_conflict")
    expect(ctx.db.tables.creatorCodeUsageLocks[0].stripeSubscriptionId).toBe(
      "sub_1"
    )
  })

  it("keeps canceled/history-only checkout available while the code lock remains permanent", async () => {
    const ctx = createCtx({
      creatorCodeUsageLocks: [usageLock()],
    })

    expect(
      shouldBlockNewCheckout({
        ended_at: Math.floor(Date.UTC(2026, 1, 1) / 1000),
        status: "canceled",
      })
    ).toBe(false)

    const result = await ensureCreatorCodeUsageLock._handler(ctx, lockArgs)

    expect(result.status).toBe("already_used")
  })
})

describe("creator earning ledger", () => {
  it("calculates the six-month payout window from subscription start", () => {
    const start = Date.UTC(2026, 0, 31, 12)
    const end = calculateCreatorPayoutEligibilityEndsAt(start)

    expect(new Date(end).toISOString()).toBe("2026-07-31T12:00:00.000Z")
  })

  it("creates earning rows for paid invoices inside the six-month window", async () => {
    const ctx = createCtx({
      creatorCodeUsageLocks: [usageLock()],
    })

    await syncBillingInvoices._handler(ctx, {
      clerkUserId: "subscriber_clerk",
      invoices: [invoice()],
      stripeCustomerId: "cus_1",
      userId: "users:subscriber",
    })

    expect(ctx.db.tables.creatorEarningLedger).toHaveLength(1)
    expect(ctx.db.tables.creatorEarningLedger[0]).toMatchObject({
      earningAmount: 200,
      idempotencyKey: "stripe_invoice:in_1:sub_1",
      status: "eligible",
      stripeInvoiceId: "in_1",
    })
  })

  it("does not create earnings for paid invoices outside the six-month window", async () => {
    const ctx = createCtx({
      creatorCodeUsageLocks: [usageLock()],
    })

    await syncBillingInvoices._handler(ctx, {
      clerkUserId: "subscriber_clerk",
      invoices: [
        invoice({
          invoiceIssuedAt: Date.UTC(2026, 6, 2),
          stripeInvoiceId: "in_after_window",
        }),
      ],
      stripeCustomerId: "cus_1",
      userId: "users:subscriber",
    })

    expect(ctx.db.tables.creatorEarningLedger).toHaveLength(0)
  })

  it("is idempotent for duplicate invoice syncs", async () => {
    const ctx = createCtx({
      creatorCodeUsageLocks: [usageLock()],
    })
    const args = {
      clerkUserId: "subscriber_clerk",
      invoices: [invoice()],
      stripeCustomerId: "cus_1",
      userId: "users:subscriber",
    }

    await syncBillingInvoices._handler(ctx, args)
    await syncBillingInvoices._handler(ctx, args)

    expect(ctx.db.tables.creatorEarningLedger).toHaveLength(1)
  })

  it("does not create payable earnings for unpaid, void, failed, or draft invoices", async () => {
    const ctx = createCtx({
      creatorCodeUsageLocks: [usageLock()],
    })

    await syncBillingInvoices._handler(ctx, {
      clerkUserId: "subscriber_clerk",
      invoices: [
        invoice({ amountPaid: 0, status: "open", stripeInvoiceId: "in_open" }),
        invoice({ amountPaid: 0, status: "void", stripeInvoiceId: "in_void" }),
        invoice({
          amountPaid: 0,
          status: "failed",
          stripeInvoiceId: "in_failed",
        }),
        invoice({
          amountPaid: 0,
          status: "draft",
          stripeInvoiceId: "in_draft",
        }),
      ],
      stripeCustomerId: "cus_1",
      userId: "users:subscriber",
    })

    expect(ctx.db.tables.creatorEarningLedger).toHaveLength(0)
  })
})

describe("creator checkout and dashboard presentation", () => {
  it("keeps creator-code Stripe coupons duration once", () => {
    expect(
      buildCreatorDiscountCouponCreateParams({
        creatorCode: "ALPHA",
        discountPercent: 10,
      })
    ).toMatchObject({
      duration: "once",
      id: "creator_once_alpha_10",
      percent_off: 10,
    })
  })

  it("creates hosted subscription Checkout Sessions with coupon discounts", async () => {
    const calls = []
    const session = await createHostedSubscriptionCheckoutSession({
      cancelUrl: "https://example.test/cancel",
      customerId: "cus_1",
      discountCouponId: "coupon_1",
      lineItemPriceId: "price_1",
      metadata: {
        creatorCode: "ALPHA",
      },
      stripe: {
        checkout: {
          sessions: {
            create(params, options) {
              calls.push({ options, params })
              return { id: "cs_1", url: "https://checkout.stripe.test" }
            },
          },
        },
      },
      successUrl: "https://example.test/success",
      userId: "users:subscriber",
    })

    expect(session.id).toBe("cs_1")
    expect(calls[0].params).toMatchObject({
      adaptive_pricing: { enabled: true },
      discounts: [{ coupon: "coupon_1" }],
      mode: "subscription",
      ui_mode: "hosted",
    })
    expect(calls[0].options).toBeUndefined()
  })

  it("creates a fresh hosted Checkout Session for repeat attempts", async () => {
    const calls = []
    const stripe = {
      checkout: {
        sessions: {
          create(params, options) {
            calls.push({ options, params })
            return {
              id: `cs_${calls.length}`,
              url: `https://checkout.stripe.test/${calls.length}`,
            }
          },
        },
      },
    }
    const baseArgs = {
      cancelUrl: "https://example.test/cancel",
      customerId: "cus_1",
      lineItemPriceId: "price_1",
      metadata: {
        creatorCode: "",
      },
      stripe,
      successUrl: "https://example.test/success",
      userId: "users:subscriber",
    }

    const first = await createHostedSubscriptionCheckoutSession(baseArgs)
    const second = await createHostedSubscriptionCheckoutSession(baseArgs)

    expect(first.id).toBe("cs_1")
    expect(second.id).toBe("cs_2")
    expect(calls).toHaveLength(2)
    expect(calls.every((call) => call.options === undefined)).toBe(true)
  })

  it("changes creator dashboard estimate wording based on Connect payout readiness", () => {
    const notReady = getEstimatedPayoutPresentation({
      connectPayoutReady: false,
      estimatedEarningsByCurrency: [{ amount: 2500, currency: "gbp" }],
      paidConversionCount: 1,
      payoutEligible: true,
    })
    const ready = getEstimatedPayoutPresentation({
      connectPayoutReady: true,
      estimatedEarningsByCurrency: [{ amount: 2500, currency: "gbp" }],
      paidConversionCount: 1,
      payoutEligible: true,
    })

    expect(notReady.detail).toBe(
      "This is an estimation of what you could have been paid if you had connected Stripe."
    )
    expect(ready.detail).toBe(
      "This is an estimation of your next monthly payout."
    )
    expect(ready.value).toBe("£25.00")
  })
})
