const INDEX_FIELDS = {
  connectedAccounts: {
    by_provider_and_providerUserId: ["provider", "providerUserId"],
    by_userId: ["userId"],
  },
  viewerQueueCooldowns: {
    by_queueId_platformUserId_command: [
      "queueId",
      "platform",
      "platformUserId",
      "command",
    ],
  },
  viewerQueueEntries: {
    by_queueId: ["queueId"],
    by_queueId_and_joinedAt: ["queueId"],
    by_queueId_and_linkedUserId: ["queueId", "linkedUserId"],
    by_queueId_and_platformUserId: ["queueId", "platform", "platformUserId"],
  },
  viewerQueueNotifications: {
    by_platform_and_status_and_nextAttemptAt: [
      "platform",
      "notificationStatus",
      "nextAttemptAt",
    ],
    by_roundId: ["roundId"],
    by_roundId_and_platformUserId: ["roundId", "platform", "platformUserId"],
  },
  viewerQueues: {
    by_creatorUserId: ["creatorUserId"],
    by_guildId_and_channelId: ["guildId", "channelId"],
    by_isActive: ["isActive"],
    by_twitchBroadcasterId: ["twitchBroadcasterId"],
  },
}

function compareByField(field) {
  return (left, right) => {
    const leftValue = left[field] ?? 0
    const rightValue = right[field] ?? 0

    if (leftValue === rightValue) {
      return String(left._id).localeCompare(String(right._id))
    }

    return leftValue - rightValue
  }
}

class FakeQuery {
  #db
  #filters = []
  #indexName = null
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
    this.#indexName = indexName

    return this
  }

  async collect() {
    return this.#applyFilters()
  }

  async first() {
    return this.#applyFilters()[0] ?? null
  }

  async take(limit) {
    return this.#applyFilters().slice(0, limit)
  }

  async unique() {
    const matches = this.#applyFilters()

    if (matches.length > 1) {
      throw new Error(`expected_unique_result:${this.#table}:${this.#indexName}`)
    }

    return matches[0] ?? null
  }

  #applyFilters() {
    const table = [...(this.#db.tables[this.#table] ?? [])]
    const matches = table.filter((doc) =>
      this.#filters.every(({ field, op, value }) => {
        if (op === "eq") {
          return doc[field] === value
        }

        if (op === "lte") {
          return (doc[field] ?? Number.POSITIVE_INFINITY) <= value
        }

        throw new Error(`unsupported_filter_op:${op}`)
      })
    )

    if (this.#indexName === "by_queueId_and_joinedAt") {
      return matches.sort(compareByField("joinedAt"))
    }

    if (this.#indexName === "by_platform_and_status_and_nextAttemptAt") {
      return matches.sort(compareByField("nextAttemptAt"))
    }

    return matches
  }
}

export class FakeDb {
  constructor(initialTables) {
    this.tables = {
      connectedAccounts: [],
      viewerQueueCooldowns: [],
      viewerQueueEntries: [],
      viewerQueueNotifications: [],
      viewerQueueRounds: [],
      viewerQueues: [],
      ...(initialTables ?? {}),
    }
    this.idCounter = 0
  }

  query(table) {
    return new FakeQuery(this, table)
  }

  async delete(id) {
    for (const [tableName, table] of Object.entries(this.tables)) {
      const index = table.findIndex((doc) => doc._id === id)

      if (index !== -1) {
        table.splice(index, 1)
        return { id, tableName }
      }
    }

    throw new Error(`missing_doc:${id}`)
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

export function createMutationCtx(initialTables) {
  return {
    db: new FakeDb(initialTables),
  }
}

export function createQueryCtx(initialTables) {
  return {
    db: new FakeDb(initialTables),
  }
}

export function createQueue(overrides = {}) {
  return {
    _id: "viewerQueues:1",
    channelId: "channel-1",
    createdAt: 0,
    creatorDisplayName: "Creator",
    creatorUserId: "users:1",
    gameLabel: "Call of Duty",
    guildId: "guild-1",
    inviteMode: "manual_creator_contact",
    isActive: true,
    matchesPerViewer: 1,
    maxRank: "top250",
    minRank: "bronze",
    playersPerBatch: 2,
    title: "Play With Viewers",
    twitchBotAnnouncementsEnabled: true,
    twitchBroadcasterId: "broadcaster-1",
    twitchBroadcasterLogin: "creator",
    twitchCommandsEnabled: true,
    updatedAt: 0,
    ...overrides,
  }
}

export function createSelectedUser(overrides = {}) {
  return {
    displayName: "Viewer",
    platform: "discord",
    platformUserId: "discord-1",
    rank: "gold",
    username: "viewer",
    ...overrides,
  }
}

export function createQueueRound(overrides = {}) {
  return {
    _id: "viewerQueueRounds:1",
    createdAt: 0,
    mode: "bot_dm",
    queueId: "viewerQueues:1",
    selectedCount: 1,
    selectedUsers: [createSelectedUser()],
    ...overrides,
  }
}

export async function withMockedNow(now, callback) {
  const originalNow = Date.now
  Date.now = () => now

  try {
    return await callback()
  } finally {
    Date.now = originalNow
  }
}
