import { describe, expect, it } from "bun:test"

import {
  createSession as createDashboardSession,
  logMatch as logDashboardMatch,
} from "../stats/dashboard.ts"
import { logMatch as logLegacyMatch } from "../stats/games.ts"

const INDEX_FIELDS = {
  activisionUsernames: {
    by_owner: ["ownerUserId"],
    by_owner_normalized: ["ownerUserId", "normalizedUsername"],
  },
  billingAccessGrants: {
    by_userId: ["userId"],
  },
  billingCustomers: {
    by_userId: ["userId"],
  },
  billingEntitlements: {
    by_userId: ["userId"],
  },
  billingPlanFeatures: {
    by_planKey: ["planKey"],
  },
  billingSubscriptions: {
    by_userId: ["userId"],
  },
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
    by_owner_startedAt: ["ownerUserId", "startedAt"],
    by_user: ["userId"],
    by_uuid: ["uuid"],
  },
  users: {
    by_clerkUserId: ["clerkUserId"],
    by_discordId: ["discordId"],
  },
}

class FakeQuery {
  #db
  #filters = []
  #filterExpression = null
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

  filter(selector) {
    this.#filterExpression = selector({
      eq(left, right) {
        return {
          left,
          operator: "eq",
          right,
          type: "binary",
        }
      },
      field(name) {
        return {
          name,
          type: "field",
        }
      },
    })

    return this
  }

  order() {
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

    return table.filter((doc) => {
      const matchesIndexFilters = this.#filters.every(
        ([field, value]) => doc[field] === value
      )

      if (!matchesIndexFilters) {
        return false
      }

      if (!this.#filterExpression) {
        return true
      }

      return this.#evaluateExpression(doc, this.#filterExpression)
    })
  }

  #evaluateExpression(doc, expression) {
    if (!expression) {
      return true
    }

    if (expression.type === "binary" && expression.operator === "eq") {
      return (
        this.#resolveOperand(doc, expression.left) ===
        this.#resolveOperand(doc, expression.right)
      )
    }

    throw new Error(`unsupported_expression:${JSON.stringify(expression)}`)
  }

  #resolveOperand(doc, operand) {
    if (operand?.type === "field") {
      return doc[operand.name]
    }

    return operand
  }
}

class FakeDb {
  constructor(initialTables) {
    this.idCounter = 0
    this.tables = Object.fromEntries(
      Object.entries({
        activisionUsernames: [],
        billingAccessGrants: [],
        billingCustomers: [],
        billingEntitlements: [],
        billingFeatures: [],
        billingPlanFeatures: [],
        billingPlans: [],
        billingSubscriptions: [],
        games: [],
        landingGlobalStats: [],
        landingUserStats: [],
        rankedConfigs: [],
        rankedMaps: [],
        rankedModes: [],
        rankedTitles: [],
        sessions: [],
        users: [],
        ...(initialTables ?? {}),
      }).map(([table, docs]) => [
        table,
        docs.map((doc, index) => ({
          _creationTime: doc._creationTime ?? index + 1,
          ...doc,
        })),
      ])
    )
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
      _creationTime: this.idCounter,
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

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete doc[key]
      } else {
        doc[key] = value
      }
    }
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

function createMutationContext({ clerkUserId = "clerk-user-1", initialTables } = {}) {
  const db = new FakeDb(initialTables)
  const schedulerCalls = []

  return {
    db,
    schedulerCalls,
    ctx: {
      auth: {
        getUserIdentity: async () => ({
          subject: clerkUserId,
          tokenIdentifier: `${clerkUserId}|token`,
        }),
      },
      db,
      scheduler: {
        runAfter: async (delay, fn, args) => {
          schedulerCalls.push({ args, delay, fn })
        },
      },
    },
  }
}

function createUser(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "users:1",
    clerkUserId: "clerk-user-1",
    discordId: "discord-user-1",
    plan: "premium",
    ...overrides,
  }
}

function createRankedConfig(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "rankedConfigs:1",
    activeSeason: 2,
    activeTitleKey: "mwiii",
    key: "current",
    updatedAt: 1,
    updatedByUserId: "users:staff",
    ...overrides,
  }
}

function createRankedTitle(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "rankedTitles:1",
    isActive: true,
    key: "mwiii",
    label: "MWIII",
    ...overrides,
  }
}

function createRankedMode(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "rankedModes:1",
    isActive: true,
    key: "hardpoint",
    label: "Hardpoint",
    titleKey: "mwiii",
    ...overrides,
  }
}

function createRankedMap(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "rankedMaps:1",
    isActive: true,
    name: "Vista",
    supportedModeIds: ["rankedModes:1"],
    titleKey: "mwiii",
    ...overrides,
  }
}

function createSessionDoc(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "sessions:1",
    activisionUsernameId: "activisionUsernames:1",
    activisionUsernameSnapshot: "Player#1234",
    bestStreak: 0,
    codTitle: "MWIII",
    currentSr: 100,
    deaths: 0,
    endedAt: null,
    kills: 0,
    losses: 0,
    matchCount: 0,
    ownerUserId: "users:1",
    season: 2,
    startSr: 100,
    startedAt: 10,
    streak: 0,
    titleKey: "mwiii",
    titleLabelSnapshot: "MWIII",
    titleSeasonKey: "mwiii::2",
    userId: "discord-user-1",
    uuid: "session-uuid-1",
    wins: 0,
    ...overrides,
  }
}

function createUsernameDoc(overrides = {}) {
  return {
    _creationTime: 1,
    _id: "activisionUsernames:1",
    createdAt: 10,
    displayUsername: "Player#1234",
    isPrimary: true,
    lastUsedAt: 10,
    normalizedUsername: "player#1234",
    ownerUserId: "users:1",
    updatedAt: 10,
    ...overrides,
  }
}

function createDashboardFixture(overrides = {}) {
  const user = createUser({ plan: overrides.plan ?? "premium" })
  const username = createUsernameDoc()
  const session = createSessionDoc()
  const { ctx, db, schedulerCalls } = createMutationContext({
    initialTables: {
      activisionUsernames: overrides.activisionUsernames ?? [username],
      rankedConfigs: [createRankedConfig()],
      rankedMaps: [createRankedMap()],
      rankedModes: [createRankedMode()],
      rankedTitles: [createRankedTitle()],
      sessions: overrides.sessions ?? [session],
      users: [user],
    },
  })

  return {
    ctx,
    db,
    schedulerCalls,
    sessionId: (overrides.sessions ?? [session])[0]?._id ?? session._id,
    user,
  }
}

function createLegacyFixture(overrides = {}) {
  const session = createSessionDoc({
    currentSr: overrides.currentSr ?? 100,
    deaths: 4,
    kills: 10,
    losses: 2,
    matchCount: 6,
    startSr: 100,
    streak: 2,
    userId: "discord-user-1",
    uuid: "legacy-session-uuid",
    wins: 4,
    ...overrides.session,
  })
  const { ctx, db, schedulerCalls } = createMutationContext({
    initialTables: {
      sessions: [session],
      users: [createUser()],
    },
  })

  return {
    ctx,
    db,
    schedulerCalls,
    session,
  }
}

describe("dashboard stats session creation security", () => {
  it("returns free_limit_reused without creating a username when a free user already has an active session", async () => {
    const activeSession = createSessionDoc({
      _id: "sessions:active",
      activisionUsernameId: "activisionUsernames:existing",
      activisionUsernameSnapshot: "Existing#1111",
      startedAt: 20,
      uuid: "active-session-uuid",
    })
    const { ctx, db, schedulerCalls } = createMutationContext({
      initialTables: {
        rankedConfigs: [createRankedConfig()],
        rankedTitles: [createRankedTitle()],
        sessions: [activeSession],
        users: [createUser({ plan: "free" })],
      },
    })

    const result = await createDashboardSession._handler(ctx, {
      newUsername: "NewUser#2222",
      startSr: 5400,
    })

    expect(result).toEqual({
      created: false,
      reason: "free_limit_reused",
      sessionId: "sessions:active",
    })
    expect(db.tables.activisionUsernames).toHaveLength(0)
    expect(db.tables.sessions).toHaveLength(1)
    expect(db.tables.landingGlobalStats).toHaveLength(0)
    expect(db.tables.landingUserStats).toHaveLength(0)
    expect(schedulerCalls).toHaveLength(0)
  })

  it("rejects malformed username selection before any reuse behavior or writes", async () => {
    const existingUsername = createUsernameDoc({
      _id: "activisionUsernames:existing",
      normalizedUsername: "existing#1111",
    })
    const activeSession = createSessionDoc({
      _id: "sessions:active",
      activisionUsernameId: existingUsername._id,
      activisionUsernameSnapshot: existingUsername.displayUsername,
      startedAt: 20,
      uuid: "active-session-uuid",
    })
    const originalLastUsedAt = existingUsername.lastUsedAt
    const { ctx, db } = createMutationContext({
      initialTables: {
        activisionUsernames: [existingUsername],
        rankedConfigs: [createRankedConfig()],
        rankedTitles: [createRankedTitle()],
        sessions: [activeSession],
        users: [createUser({ plan: "free" })],
      },
    })

    await expect(
      createDashboardSession._handler(ctx, {
        existingUsernameId: existingUsername._id,
        newUsername: "Other#9999",
        startSr: 5400,
      })
    ).rejects.toThrow("Choose an existing Activision username or enter a new one.")

    expect(db.tables.activisionUsernames).toHaveLength(1)
    expect(db.tables.activisionUsernames[0].lastUsedAt).toBe(originalLastUsedAt)
    expect(db.tables.sessions).toHaveLength(1)
  })

  it("still creates a username and session for allowed plans", async () => {
    const { ctx, db, schedulerCalls } = createMutationContext({
      initialTables: {
        rankedConfigs: [createRankedConfig()],
        rankedTitles: [createRankedTitle()],
        users: [createUser({ plan: "premium" })],
      },
    })

    const result = await createDashboardSession._handler(ctx, {
      newUsername: "Premium#5555",
      startSr: 5400,
    })

    expect(result.created).toBe(true)
    expect(result.reason).toBe("created")
    expect(db.tables.activisionUsernames).toHaveLength(1)
    expect(db.tables.activisionUsernames[0].displayUsername).toBe("Premium#5555")
    expect(db.tables.sessions).toHaveLength(1)
    expect(db.tables.sessions[0].activisionUsernameSnapshot).toBe("Premium#5555")
    expect(db.tables.landingGlobalStats[0].activeSessions).toBe(1)
    expect(db.tables.landingUserStats[0].activeSessions).toBe(1)
    expect(schedulerCalls).toHaveLength(2)
  })
})

describe("dashboard stats match logging security", () => {
  function createDashboardLogArgs(overrides = {}) {
    return {
      mapId: "rankedMaps:1",
      modeId: "rankedModes:1",
      outcome: "loss",
      sessionId: "sessions:1",
      srChange: -5,
      ...overrides,
    }
  }

  it("accepts negative whole-number SR changes when the resulting current SR remains valid", async () => {
    const { ctx, db, schedulerCalls } = createDashboardFixture({
      sessions: [createSessionDoc({ currentSr: 10, startSr: 15 })],
    })

    const result = await logDashboardMatch._handler(
      ctx,
      createDashboardLogArgs({ srChange: -5 })
    )

    expect(result.sessionId).toBe("sessions:1")
    expect(db.tables.games).toHaveLength(1)
    expect(db.tables.games[0].srChange).toBe(-5)
    expect(db.tables.sessions[0].currentSr).toBe(5)
    expect(schedulerCalls).toHaveLength(2)
  })

  it("rejects fractional SR changes without writing game or session data", async () => {
    const { ctx, db, schedulerCalls } = createDashboardFixture()

    await expect(
      logDashboardMatch._handler(ctx, createDashboardLogArgs({ srChange: 1.5 }))
    ).rejects.toThrow("SR change must be a whole number.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(100)
    expect(db.tables.sessions[0].matchCount).toBe(0)
    expect(db.tables.landingGlobalStats).toHaveLength(0)
    expect(db.tables.landingUserStats).toHaveLength(0)
    expect(schedulerCalls).toHaveLength(0)
  })

  it("rejects SR changes that would make current SR negative", async () => {
    const { ctx, db } = createDashboardFixture({
      sessions: [createSessionDoc({ currentSr: 3, startSr: 20 })],
    })

    await expect(
      logDashboardMatch._handler(ctx, createDashboardLogArgs({ srChange: -4 }))
    ).rejects.toThrow("SR change would move current SR outside the 0 to 20000 range.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(3)
  })

  it("rejects SR changes that would push current SR above the maximum range", async () => {
    const { ctx, db } = createDashboardFixture({
      sessions: [createSessionDoc({ currentSr: 19999, startSr: 19000 })],
    })

    await expect(
      logDashboardMatch._handler(ctx, createDashboardLogArgs({ srChange: 2 }))
    ).rejects.toThrow("SR change would move current SR outside the 0 to 20000 range.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(19999)
  })
})

describe("legacy stats match logging security", () => {
  function createLegacyLogArgs(overrides = {}) {
    return {
      deaths: 4,
      kills: 10,
      lossProtected: false,
      mode: "hardpoint",
      outcome: "loss",
      sessionUuid: "legacy-session-uuid",
      srChange: -5,
      ...overrides,
    }
  }

  it("accepts negative whole-number SR changes when the resulting current SR remains valid", async () => {
    const { ctx, db, schedulerCalls } = createLegacyFixture({
      currentSr: 10,
    })

    await logLegacyMatch._handler(ctx, createLegacyLogArgs({ srChange: -5 }))

    expect(db.tables.games).toHaveLength(1)
    expect(db.tables.games[0].srChange).toBe(-5)
    expect(db.tables.sessions[0].currentSr).toBe(5)
    expect(schedulerCalls).toHaveLength(2)
  })

  it("rejects fractional SR changes without writing game or session data", async () => {
    const { ctx, db, schedulerCalls } = createLegacyFixture()

    await expect(
      logLegacyMatch._handler(ctx, createLegacyLogArgs({ srChange: 1.5 }))
    ).rejects.toThrow("SR change must be a whole number.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(100)
    expect(schedulerCalls).toHaveLength(0)
  })

  it("rejects SR changes that would make current SR negative", async () => {
    const { ctx, db } = createLegacyFixture({
      currentSr: 2,
    })

    await expect(
      logLegacyMatch._handler(ctx, createLegacyLogArgs({ srChange: -3 }))
    ).rejects.toThrow("SR change would move current SR outside the 0 to 20000 range.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(2)
  })

  it("rejects SR changes that would push current SR above the maximum range", async () => {
    const { ctx, db } = createLegacyFixture({
      currentSr: 19999,
    })

    await expect(
      logLegacyMatch._handler(ctx, createLegacyLogArgs({ srChange: 2 }))
    ).rejects.toThrow("SR change would move current SR outside the 0 to 20000 range.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(19999)
  })

  it("rejects negative kills", async () => {
    const { ctx, db } = createLegacyFixture()

    await expect(
      logLegacyMatch._handler(ctx, createLegacyLogArgs({ kills: -1 }))
    ).rejects.toThrow("Kills must be a non-negative whole number.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].kills).toBe(10)
  })

  it("rejects fractional deaths", async () => {
    const { ctx, db } = createLegacyFixture()

    await expect(
      logLegacyMatch._handler(ctx, createLegacyLogArgs({ deaths: 1.5 }))
    ).rejects.toThrow("Deaths must be a non-negative whole number.")

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].deaths).toBe(4)
  })
})
