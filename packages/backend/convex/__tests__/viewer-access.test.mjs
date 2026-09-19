import { describe, expect, it } from "bun:test"
import { getViewerAccess } from "../queries/users.ts"

function context({ signedIn = true, user = null, customer = null } = {}) {
  const reads = []
  const tables = {
    users: user ? [user] : [],
    billingCustomers: customer ? [customer] : [],
  }
  return {
    reads,
    auth: {
      getUserIdentity: async () =>
        signedIn ? { subject: "clerk-viewer" } : null,
    },
    db: {
      query(table) {
        reads.push(table)
        const rows = tables[table] ?? []
        return {
          collect: async () => rows,
          withIndex(_name, apply) {
            apply({
              eq(field, value) {
                if (table === "users")
                  expect([field, value]).toEqual([
                    "clerkUserId",
                    "clerk-viewer",
                  ])
                else if (table !== "billingPlanFeatures")
                  expect([field, value]).toEqual(["userId", "viewer"])
              },
            })
            return {
              collect: async () => rows,
              unique: async () => rows[0] ?? null,
            }
          },
        }
      },
    },
  }
}

const user = {
  _id: "viewer",
  clerkUserId: "clerk-viewer",
  role: "user",
  plan: "free",
}

describe("viewer access snapshot", () => {
  it("does not read any database data for anonymous viewers", async () => {
    const ctx = context({ signedIn: false })
    expect(await getViewerAccess._handler(ctx, {})).toBeNull()
    expect(ctx.reads).toEqual([])
  })
  it("denies access while a signed-in user record is missing", async () => {
    const ctx = context()
    expect(await getViewerAccess._handler(ctx, {})).toBeNull()
    expect(ctx.reads).toEqual(["users"])
  })
  it("reads the user once and returns only presentation access", async () => {
    const ctx = context({ user })
    expect(await getViewerAccess._handler(ctx, {})).toEqual({
      role: "user",
      plan: "free",
      hasCreatorAccess: false,
    })
    expect(ctx.reads.filter((table) => table === "users")).toHaveLength(1)
    expect(ctx.reads).not.toContain("creatorAccounts")
  })
  it("preserves legacy creator access until billing becomes authoritative", async () => {
    const creator = { ...user, plan: "creator" }
    expect(
      await getViewerAccess._handler(context({ user: creator }), {})
    ).toEqual({ role: "user", plan: "creator", hasCreatorAccess: true })
    expect(
      await getViewerAccess._handler(
        context({ user: creator, customer: { userId: "viewer" } }),
        {}
      )
    ).toEqual({ role: "user", plan: "free", hasCreatorAccess: false })
  })
  it("retains staff creator-workspace access without upgrading their plan", async () => {
    expect(
      await getViewerAccess._handler(
        context({ user: { ...user, role: "staff" } }),
        {}
      )
    ).toEqual({ role: "staff", plan: "free", hasCreatorAccess: true })
  })
})
