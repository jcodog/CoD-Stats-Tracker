import { describe, expect, it } from "bun:test"

import {
  EMPTY_LANDING_COUNTERS,
  applyGlobalLandingStatsDelta,
  applyUserLandingStatsDelta,
  getGlobalLandingCounters,
  getUserLandingCounters,
  toWinRate,
} from "../landingMetrics.js"

const INDEX_FIELDS = {
  landingGlobalStats: {
    by_key: ["key"],
  },
  landingUserStats: {
    by_userId: ["userId"],
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

        filters.push([field, value])
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

  async first() {
    return this.#applyFilters()[0] ?? null
  }

  #applyFilters() {
    const table = this.#db.tables[this.#table] ?? []
    return table.filter((doc) =>
      this.#filters.every(([field, value]) => doc[field] === value)
    )
  }
}

class FakeDb {
  constructor(initialTables) {
    this.tables = {
      landingGlobalStats: [],
      landingUserStats: [],
      ...(initialTables ?? {}),
    }
    this.idCounter = 0
  }

  query(table) {
    return new FakeQuery(this, table)
  }

  async insert(table, value) {
    this.idCounter += 1
    const doc = {
      _id: `${table}:${this.idCounter}`,
      _creationTime: Date.now(),
      ...value,
    }
    this.tables[table].push(doc)
    return doc._id
  }

  async get(id) {
    for (const table of Object.keys(this.tables)) {
      const found = this.tables[table].find((doc) => doc._id === id)
      if (found) {
        return found
      }
    }

    return null
  }

  async patch(id, patch) {
    const doc = await this.get(id)
    if (!doc) {
      throw new Error(`missing_doc:${id}`)
    }

    Object.assign(doc, patch)
  }
}

function createMutationCtx(initialTables) {
  return {
    db: new FakeDb(initialTables),
  }
}

function createQueryCtx(initialTables) {
  return {
    db: new FakeDb(initialTables),
  }
}

describe("landing metrics helpers", () => {
  it("skips zero-value deltas", async () => {
    const ctx = createMutationCtx()

    await applyGlobalLandingStatsDelta(ctx, {})
    await applyUserLandingStatsDelta(ctx, "user_123", {
      matchesIndexed: 0,
      wins: 0,
    })

    expect(ctx.db.tables.landingGlobalStats).toHaveLength(0)
    expect(ctx.db.tables.landingUserStats).toHaveLength(0)
  })

  it("creates and updates global counters while clamping at zero", async () => {
    const ctx = createMutationCtx()

    await applyGlobalLandingStatsDelta(ctx, {
      matchesIndexed: 4,
      sessionsTracked: 2,
      activeSessions: 1,
      wins: 3,
      losses: 1,
    })
    await applyGlobalLandingStatsDelta(ctx, {
      activeSessions: -3,
      losses: -5,
    })

    expect(ctx.db.tables.landingGlobalStats[0]).toMatchObject({
      key: "global",
      matchesIndexed: 4,
      sessionsTracked: 2,
      activeSessions: 0,
      wins: 3,
      losses: 0,
    })
  })

  it("creates, aggregates, and deduplicates user counters", async () => {
    const ctx = createMutationCtx()

    await applyUserLandingStatsDelta(ctx, "user_123", {
      matchesIndexed: 5,
      wins: 4,
      losses: 1,
    })
    await applyUserLandingStatsDelta(ctx, "user_456", {
      sessionsTracked: 2,
      activeSessions: 1,
    })

    const queryCtx = createQueryCtx({
      landingUserStats: ctx.db.tables.landingUserStats,
    })

    expect(
      await getUserLandingCounters(queryCtx, ["user_123", "user_123"])
    ).toEqual({
      ...EMPTY_LANDING_COUNTERS,
      matchesIndexed: 5,
      wins: 4,
      losses: 1,
    })

    expect(
      await getUserLandingCounters(queryCtx, ["user_123", "user_456"])
    ).toEqual({
      matchesIndexed: 5,
      sessionsTracked: 2,
      activeSessions: 1,
      wins: 4,
      losses: 1,
    })
  })

  it("returns null or empty counters when no landing stats exist", async () => {
    const ctx = createQueryCtx()

    expect(await getGlobalLandingCounters(ctx)).toEqual(EMPTY_LANDING_COUNTERS)
    expect(await getUserLandingCounters(ctx, [])).toBeNull()
    expect(await getUserLandingCounters(ctx, ["missing_user"])).toBeNull()
  })

  it("computes win rates from wins and losses", () => {
    expect(toWinRate(0, 0)).toBe(0)
    expect(toWinRate(3, 1)).toBe(75)
  })
})
