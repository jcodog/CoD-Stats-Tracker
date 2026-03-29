import { describe, expect, it } from "bun:test"

import { setCurrentRankedConfig } from "../staff/internal.ts"

const INDEX_FIELDS = {
  landingGlobalStats: {
    by_key: ["key"],
  },
  landingUserStats: {
    by_userId: ["userId"],
  },
  rankedConfigs: {
    by_key: ["key"],
  },
  rankedTitles: {
    by_key: ["key"],
  },
  sessions: {
    by_endedAt: ["endedAt"],
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

  async unique() {
    const matches = this.#applyFilters()
    if (matches.length > 1) {
      throw new Error(`unique_expected:${this.#table}`)
    }

    return matches[0] ?? null
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
      rankedConfigs: [],
      rankedTitles: [],
      sessions: [],
      ...(initialTables ?? {}),
    }
    this.idCounter = 0
  }

  query(table) {
    return new FakeQuery(this, table)
  }

  async get(id) {
    return this.#findById(id)
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

  async patch(id, patch) {
    const doc = this.#findById(id)
    if (!doc) {
      throw new Error(`missing_doc:${id}`)
    }

    Object.assign(doc, patch)
  }

  #findById(id) {
    for (const table of Object.values(this.tables)) {
      const found = table.find((doc) => doc._id === id)
      if (found) {
        return found
      }
    }

    return null
  }
}

function createTestContext(initialTables) {
  const db = new FakeDb(initialTables)
  const schedulerCalls = []

  return {
    db,
    schedulerCalls,
    ctx: {
      db,
      scheduler: {
        runAfter: async (delay, fn, args) => {
          schedulerCalls.push({ delay, fn, args })
        },
      },
    },
  }
}

describe("ranked config rollover landing metrics", () => {
  it("archives open sessions and decrements landing active session counters", async () => {
    const { ctx, db, schedulerCalls } = createTestContext({
      landingGlobalStats: [
        {
          _id: "landingGlobalStats:1",
          key: "global",
          matchesIndexed: 12,
          sessionsTracked: 3,
          activeSessions: 3,
          wins: 7,
          losses: 5,
          updatedAt: 100,
        },
      ],
      landingUserStats: [
        {
          _id: "landingUserStats:1",
          userId: "discord-user-a",
          matchesIndexed: 8,
          sessionsTracked: 2,
          activeSessions: 2,
          wins: 5,
          losses: 3,
          updatedAt: 100,
        },
        {
          _id: "landingUserStats:2",
          userId: "discord-user-b",
          matchesIndexed: 4,
          sessionsTracked: 1,
          activeSessions: 1,
          wins: 2,
          losses: 2,
          updatedAt: 100,
        },
      ],
      rankedConfigs: [
        {
          _id: "rankedConfigs:1",
          key: "current",
          activeSeason: 1,
          activeTitleKey: "mwii",
          updatedAt: 100,
          updatedByUserId: "users:staff",
        },
      ],
      rankedTitles: [
        {
          _id: "rankedTitles:1",
          key: "mwiii",
          label: "MWIII",
          isActive: true,
        },
      ],
      sessions: [
        {
          _id: "sessions:1",
          userId: "discord-user-a",
          endedAt: null,
        },
        {
          _id: "sessions:2",
          userId: "discord-user-a",
          endedAt: null,
        },
        {
          _id: "sessions:3",
          userId: "discord-user-b",
          endedAt: null,
        },
        {
          _id: "sessions:4",
          userId: "discord-user-c",
          endedAt: 1_700_000_000_000,
        },
      ],
    })

    const handler = setCurrentRankedConfig._handler
    const result = await handler(ctx, {
      activeSeason: 2,
      activeTitleKey: "mwiii",
      updatedByUserId: "users:admin",
    })

    expect(result).toMatchObject({
      activeSeason: 2,
      activeTitleKey: "mwiii",
      activeTitleLabel: "MWIII",
      archivedSessionCount: 3,
      archiveReason: "title_and_season_rollover",
      didChange: true,
      didInitialize: false,
    })

    const archivedSessions = db.tables.sessions.filter(
      (session) => session._id !== "sessions:4"
    )
    expect(archivedSessions.every((session) => session.endedAt !== null)).toBe(true)
    expect(
      archivedSessions.every(
        (session) => session.archivedReason === "title_and_season_rollover"
      )
    ).toBe(true)
    expect(db.tables.sessions.find((session) => session._id === "sessions:4")?.endedAt).toBe(
      1_700_000_000_000
    )

    expect(db.tables.landingGlobalStats[0].activeSessions).toBe(0)
    expect(
      db.tables.landingUserStats.find((doc) => doc.userId === "discord-user-a")
        ?.activeSessions
    ).toBe(0)
    expect(
      db.tables.landingUserStats.find((doc) => doc.userId === "discord-user-b")
        ?.activeSessions
    ).toBe(0)

    expect(schedulerCalls).toHaveLength(1)
    expect(schedulerCalls[0].delay).toBe(0)
    expect(schedulerCalls[0].args).toEqual({ invalidateAll: true })
  })

  it("skips landing metric updates when no open sessions are archived", async () => {
    const { ctx, db, schedulerCalls } = createTestContext({
      landingGlobalStats: [
        {
          _id: "landingGlobalStats:1",
          key: "global",
          matchesIndexed: 12,
          sessionsTracked: 3,
          activeSessions: 0,
          wins: 7,
          losses: 5,
          updatedAt: 100,
        },
      ],
      landingUserStats: [
        {
          _id: "landingUserStats:1",
          userId: "discord-user-a",
          matchesIndexed: 8,
          sessionsTracked: 2,
          activeSessions: 0,
          wins: 5,
          losses: 3,
          updatedAt: 100,
        },
      ],
      rankedConfigs: [
        {
          _id: "rankedConfigs:1",
          key: "current",
          activeSeason: 1,
          activeTitleKey: "mwii",
          updatedAt: 100,
          updatedByUserId: "users:staff",
        },
      ],
      rankedTitles: [
        {
          _id: "rankedTitles:1",
          key: "mwiii",
          label: "MWIII",
          isActive: true,
        },
      ],
      sessions: [
        {
          _id: "sessions:1",
          userId: "discord-user-a",
          endedAt: 1_700_000_000_000,
        },
      ],
    })

    const handler = setCurrentRankedConfig._handler
    const result = await handler(ctx, {
      activeSeason: 2,
      activeTitleKey: "mwiii",
      updatedByUserId: "users:admin",
    })

    expect(result.archivedSessionCount).toBe(0)
    expect(db.tables.landingGlobalStats[0].activeSessions).toBe(0)
    expect(db.tables.landingUserStats[0].activeSessions).toBe(0)
    expect(schedulerCalls).toHaveLength(0)
  })
})
