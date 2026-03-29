import { describe, expect, it } from "bun:test";

import { enqueueViewer } from "../creatorTools/playingWithViewers/queue.ts";

const INDEX_FIELDS = {
  viewerQueueEntries: {
    by_queueId_and_discordUserId: ["queueId", "discordUserId"],
  },
};

class FakeQuery {
  #db;
  #filters = [];
  #table;

  constructor(db, table) {
    this.#db = db;
    this.#table = table;
  }

  withIndex(indexName, selector) {
    const indexFields = INDEX_FIELDS[this.#table]?.[indexName];
    if (!indexFields) {
      throw new Error(`unsupported_index:${this.#table}:${indexName}`);
    }

    const filters = [];
    const builder = {
      eq(field, value) {
        if (!indexFields.includes(field)) {
          throw new Error(`unsupported_index_field:${indexName}:${field}`);
        }

        filters.push([field, value]);
        return builder;
      },
    };

    selector(builder);
    this.#filters = filters;

    return this;
  }

  async first() {
    return this.#applyFilters()[0] ?? null;
  }

  #applyFilters() {
    const table = this.#db.tables[this.#table] ?? [];

    return table.filter((doc) =>
      this.#filters.every(([field, value]) => doc[field] === value),
    );
  }
}

class FakeDb {
  constructor(initialTables) {
    this.tables = {
      viewerQueueEntries: [],
      viewerQueues: [],
      ...(initialTables ?? {}),
    };
    this.idCounter = 0;
  }

  query(table) {
    return new FakeQuery(this, table);
  }

  async get(id) {
    for (const table of Object.values(this.tables)) {
      const found = table.find((doc) => doc._id === id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  async insert(table, value) {
    this.idCounter += 1;
    const doc = {
      _id: `${table}:${this.idCounter}`,
      ...value,
    };

    this.tables[table].push(doc);
    return doc._id;
  }
}

describe("playing with viewers queue joins", () => {
  it("returns a duplicate status instead of throwing when a viewer joins twice", async () => {
    const queueId = "viewerQueues:1";
    const ctx = {
      db: new FakeDb({
        viewerQueues: [
          {
            _id: queueId,
            isActive: true,
          },
        ],
      }),
    };

    const handler = enqueueViewer._handler;

    const firstResult = await handler(ctx, {
      queueId,
      discordUserId: "discord-1",
      username: "viewer",
      displayName: "Viewer",
      avatarUrl: undefined,
      rank: "gold",
    });

    const secondResult = await handler(ctx, {
      queueId,
      discordUserId: "discord-1",
      username: "viewer",
      displayName: "Viewer",
      avatarUrl: undefined,
      rank: "gold",
    });

    expect(firstResult.status).toBe("enqueued");
    expect(secondResult.status).toBe("already_joined");
    expect(ctx.db.tables.viewerQueueEntries).toHaveLength(1);
    expect(secondResult.entryId).toBe(firstResult.entryId);
  });
});
