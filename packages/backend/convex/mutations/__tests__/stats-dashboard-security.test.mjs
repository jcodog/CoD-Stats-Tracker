import { describe, expect, it } from "bun:test"

import {
  backfillSessionOwners,
  createSession as createDashboardSession,
  logMatch as logDashboardMatch,
  updatePreferredMatchLoggingMode,
} from "../stats/dashboard.ts"
import {
  getCurrentDashboardState,
  getSessionHistoryPage,
  getSessionOverview,
  getRecentSessionMatches,
} from "../../queries/stats/dashboard.ts"
import { projectSessionHistory } from "../../../src/lib/statsAnalytics.ts"
import { logMatch as logLegacyMatch } from "../stats/games.ts"

const INDEX_FIELDS = {
  games: {
    by_session_createdat: ["sessionId", "createdAt"],
    by_session_lossProtected_createdAt: [
      "sessionId",
      "lossProtected",
      "createdAt",
    ],
  },
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
  rankedMaps: {
    by_title_active_sort: ["titleKey", "isActive"],
  },
  rankedModes: {
    by_title_active_sort: ["titleKey", "isActive"],
  },
  rankedTitles: {
    by_key: ["key"],
  },
  sessions: {
    by_owner_startedAt: ["ownerUserId", "startedAt"],
    by_owner_ended_startedAt: ["ownerUserId", "endedAt", "startedAt"],
    by_legacy_user_ended_startedAt: ["userId", "ownerUserId", "endedAt", "startedAt"],
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
  #sortFields = []
  #direction = "asc"
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
    this.#sortFields = indexFields

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

  order(direction) {
    this.#direction = direction
    return this
  }

  async paginate(options) {
    const offset = Number(options.cursor ?? 0)
    const rows = this.#applyFilters()
    const page = rows.slice(
      offset,
      offset + Math.min(options.numItems, options.maximumRowsRead)
    )
    return {
      page,
      isDone: offset + page.length >= rows.length,
      continueCursor: String(offset + page.length),
    }
  }

  async take(limit) {
    return this.#applyFilters().slice(0, limit)
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

    return [...table]
      .sort((a, b) => {
        for (const field of this.#sortFields) {
          if (a[field] !== b[field])
            return (
              (a[field] < b[field] ? -1 : 1) *
              (this.#direction === "desc" ? -1 : 1)
            )
        }
        return 0
      })
      .filter((doc) => {
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

function createMutationContext({
  clerkUserId = "clerk-user-1",
  initialTables,
} = {}) {
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
    ).rejects.toThrow(
      "Choose an existing Activision username or enter a new one."
    )

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
    expect(db.tables.activisionUsernames[0].displayUsername).toBe(
      "Premium#5555"
    )
    expect(db.tables.sessions).toHaveLength(1)
    expect(db.tables.sessions[0].activisionUsernameSnapshot).toBe(
      "Premium#5555"
    )
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
    ).rejects.toThrow(
      "SR change would move current SR outside the 0 to 20000 range."
    )

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(3)
  })

  it("rejects SR changes that would push current SR above the maximum range", async () => {
    const { ctx, db } = createDashboardFixture({
      sessions: [createSessionDoc({ currentSr: 19999, startSr: 19000 })],
    })

    await expect(
      logDashboardMatch._handler(ctx, createDashboardLogArgs({ srChange: 2 }))
    ).rejects.toThrow(
      "SR change would move current SR outside the 0 to 20000 range."
    )

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(19999)
  })
})

describe("dashboard stats logging mode preference", () => {
  it("defaults to comprehensive when the user has no stored preference", async () => {
    const { ctx } = createMutationContext({
      initialTables: {
        rankedConfigs: [createRankedConfig()],
        rankedMaps: [createRankedMap()],
        rankedModes: [createRankedMode()],
        rankedTitles: [createRankedTitle()],
        sessions: [createSessionDoc()],
        users: [createUser({ preferredMatchLoggingMode: undefined })],
      },
    })

    const result = await getCurrentDashboardState._handler(ctx, {})

    expect(result.preferredMatchLoggingMode).toBe("comprehensive")
  })

  it("updates only the authenticated user's stored preference", async () => {
    const firstUser = createUser({
      _id: "users:1",
      clerkUserId: "clerk-user-1",
      preferredMatchLoggingMode: "comprehensive",
    })
    const secondUser = createUser({
      _id: "users:2",
      clerkUserId: "clerk-user-2",
      discordId: "discord-user-2",
      preferredMatchLoggingMode: "comprehensive",
    })
    const { ctx, db } = createMutationContext({
      clerkUserId: "clerk-user-1",
      initialTables: {
        users: [firstUser, secondUser],
      },
    })

    const result = await updatePreferredMatchLoggingMode._handler(ctx, {
      preferredMatchLoggingMode: "basic",
    })

    expect(result).toEqual({ preferredMatchLoggingMode: "basic" })
    expect(
      db.tables.users.find((user) => user._id === "users:1")
    ).toMatchObject({ preferredMatchLoggingMode: "basic" })
    expect(
      db.tables.users.find((user) => user._id === "users:2")
    ).toMatchObject({ preferredMatchLoggingMode: "comprehensive" })
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
    ).rejects.toThrow(
      "SR change would move current SR outside the 0 to 20000 range."
    )

    expect(db.tables.games).toHaveLength(0)
    expect(db.tables.sessions[0].currentSr).toBe(2)
  })

  it("rejects SR changes that would push current SR above the maximum range", async () => {
    const { ctx, db } = createLegacyFixture({
      currentSr: 19999,
    })

    await expect(
      logLegacyMatch._handler(ctx, createLegacyLogArgs({ srChange: 2 }))
    ).rejects.toThrow(
      "SR change would move current SR outside the 0 to 20000 range."
    )

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

describe("dashboard projection reads", () => {
  function fixture() {
    const session = createSessionDoc({
      wins: 2,
      losses: 1,
      matchCount: 3,
      currentSr: 125,
    })
    const games = [
      {
        _id: "games:1",
        sessionId: session.uuid,
        createdAt: 1000,
        srChange: 20,
        outcome: "win",
        lossProtected: false,
      },
      {
        _id: "games:2",
        sessionId: session.uuid,
        createdAt: 2000,
        srChange: -5,
        outcome: "loss",
        lossProtected: true,
      },
      {
        _id: "games:3",
        sessionId: session.uuid,
        createdAt: 3000,
        srChange: 10,
        outcome: "win",
        lossProtected: false,
      },
    ]
    const { ctx } = createMutationContext({
      initialTables: { users: [createUser()], sessions: [session], games },
    })
    const query = ctx.db.query.bind(ctx.db)
    const reads = []
    ctx.db.query = (table) => {
      reads.push(table)
      return query(table)
    }
    return {
      ctx,
      reads,
      args: {
        sessionId: session._id,
        includeLossProtected: true,
        paginationOpts: { numItems: 200, cursor: null },
      },
    }
  }
  it("reads session counters without reading games", async () => {
    const { ctx, reads, args } = fixture()
    const overview = await getSessionOverview._handler(ctx, args)
    expect(overview.matchCount).toBe(3)
    expect(overview.currentSr).toBe(125)
    expect(reads).not.toContain("games")
  })
  it("projects charts from one history read with stable chronological SR", async () => {
    const { ctx, reads, args } = fixture()
    const page = await getSessionHistoryPage._handler(ctx, args)
    const result = projectSessionHistory(
      { id: args.sessionId, startSr: 100, startedAt: 10 },
      page.page,
      true
    )
    expect(reads.filter((table) => table === "games")).toHaveLength(1)
    expect(result.srTimeline.points.map((point) => point.sr)).toEqual([
      100, 120, 115, 125,
    ])
    expect(result.dailyPerformance.days).toEqual([
      { dateKey: "1970-01-01", wins: 2, losses: 1, netSr: 25 },
    ])
    expect(page.isDone).toBe(true)
  })
  it("filters loss-protected charts without changing authoritative counters", async () => {
    const { ctx, args } = fixture()
    const page = await getSessionHistoryPage._handler(ctx, args)
    const result = projectSessionHistory(
      { id: args.sessionId, startSr: 100, startedAt: 10 },
      page.page,
      false
    )
    expect((await getSessionOverview._handler(ctx, args)).currentSr).toBe(125)
    expect(result.srTimeline.points.map((point) => point.sr)).toEqual([
      100, 120, 130,
    ])
    expect(result.dailyPerformance.days[0].losses).toBe(0)
  })
  it("honors the recent limit and indexed loss-protection filter", async () => {
    const { ctx, args } = fixture()
    expect(
      (await getRecentSessionMatches._handler(ctx, { ...args, limit: 1 })).map(
        (game) => game.id
      )
    ).toEqual(["games:3"])
    expect(
      (
        await getRecentSessionMatches._handler(ctx, {
          ...args,
          includeLossProtected: false,
          limit: 2,
        })
      ).map((game) => game.id)
    ).toEqual(["games:3", "games:1"])
  })
  it("rejects a foreign session before reading its games", async () => {
    const { ctx, reads, args } = fixture()
    ctx.db.tables.sessions[0].ownerUserId = "users:another"
    await expect(getSessionHistoryPage._handler(ctx, args)).rejects.toThrow(
      "Session not found"
    )
    expect(reads).not.toContain("games")
  })
})
it("bounds history pages and preserves cursor continuity", async () => {
  const session = createSessionDoc()
  const games = Array.from({ length: 450 }, (_, i) => ({
    _id: `games:${i}`,
    sessionId: session.uuid,
    createdAt: i,
    srChange: 1,
    outcome: "win",
    lossProtected: false,
  }))
  const { ctx } = createMutationContext({
    initialTables: { users: [createUser()], sessions: [session], games },
  })
  const first = await getSessionHistoryPage._handler(ctx, {
    sessionId: session._id,
    paginationOpts: { numItems: 10000, cursor: null },
  })
  expect(first.page).toHaveLength(200)
  expect(first.isDone).toBe(false)
  const second = await getSessionHistoryPage._handler(ctx, {
    sessionId: session._id,
    paginationOpts: { numItems: 200, cursor: first.continueCursor },
  })
  expect(second.page[0].createdAt).toBe(200)
  expect(second.page).toHaveLength(200)
})

it("dry-runs and idempotently backfills only unambiguous session owners", async () => {
  const { ctx, db } = createMutationContext({ initialTables: {
    users: [createUser()],
    sessions: [createSessionDoc({ ownerUserId: undefined }), createSessionDoc({ _id: "sessions:2", ownerUserId: undefined, userId: "missing" })],
  } })
  const args = { paginationOpts: { numItems: 100, cursor: null }, dryRun: true }
  const preview = await backfillSessionOwners._handler(ctx, args)
  expect(preview.matched).toBe(1)
  expect(preview.unresolved).toEqual([{ sessionId: "sessions:2", reason: "missing" }])
  expect(db.tables.sessions[0].ownerUserId).toBeUndefined()
  await expect(backfillSessionOwners._handler(ctx, { ...args, dryRun: false })).rejects.toThrow("Explicit confirmation")
  await backfillSessionOwners._handler(ctx, { ...args, dryRun: false, confirmation: "backfill_session_owners" })
  expect(db.tables.sessions[0].ownerUserId).toBe("users:1")
  expect((await backfillSessionOwners._handler(ctx, args)).matched).toBe(0)
})

it("does not guess ownership when Clerk and Discord identifiers conflict", async () => {
  const { ctx, db } = createMutationContext({ initialTables: {
    users: [createUser(), createUser({ _id: "users:2", clerkUserId: "discord-user-1", discordId: "other" })],
    sessions: [createSessionDoc({ ownerUserId: undefined })],
  } })
  const result = await backfillSessionOwners._handler(ctx, { paginationOpts: { numItems: 100, cursor: null }, dryRun: false, confirmation: "backfill_session_owners" })
  expect(result.unresolved).toEqual([{ sessionId: "sessions:1", reason: "ambiguous" }])
  expect(db.tables.sessions[0].ownerUserId).toBeUndefined()
})

it("does not include archived sessions in dashboard bootstrap", async () => {
  const { ctx } = createMutationContext({ initialTables: {
    users: [createUser()], rankedConfigs: [createRankedConfig()], rankedTitles: [createRankedTitle()],
    sessions: [createSessionDoc(), ...Array.from({ length: 600 }, (_, i) => createSessionDoc({ _id: `archived:${i}`, endedAt: i + 1 }))],
  } })
  expect((await getCurrentDashboardState._handler(ctx, {})).activeSessions).toHaveLength(1)
})