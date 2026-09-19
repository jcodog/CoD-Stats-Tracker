import { describe, expect, it } from "bun:test"
import { resolveAuthorizedStaffAction } from "../staffActionAuth.ts"

const user = { _id: "users:operator", clerkUserId: "operator" }
function resolve(clerkRole, convexRole, requiredRole = "staff") {
  return resolveAuthorizedStaffAction({
    clerkUser: { publicMetadata: { role: clerkRole } },
    clerkUserId: "operator",
    dbUser: { ...user, role: convexRole },
    requiredRole,
  })
}

describe("staff action authorization", () => {
  it("rejects role mismatches without repairing metadata during reads", async () => {
    await expect(resolve("user", "admin")).rejects.toMatchObject({
      code: "role_mismatch",
    })
    await expect(resolve("admin", "user")).rejects.toMatchObject({
      code: "role_mismatch",
    })
  })
  it("rejects missing roles and missing database users", async () => {
    await expect(resolve(undefined, "admin")).rejects.toMatchObject({
      code: "missing_clerk_role",
    })
    await expect(resolve("admin", undefined)).rejects.toMatchObject({
      code: "missing_convex_role",
    })
    await expect(
      resolveAuthorizedStaffAction({
        clerkUser: {},
        clerkUserId: "operator",
        dbUser: null,
        requiredRole: "staff",
      })
    ).rejects.toMatchObject({ code: "missing_convex_user" })
  })
  it("allows aligned staff but denies admin actions to staff or normal users", async () => {
    expect((await resolve("staff", "staff")).actorRole).toBe("staff")
    await expect(resolve("staff", "staff", "admin")).rejects.toMatchObject({
      code: "insufficient_role",
    })
    await expect(resolve("user", "user")).rejects.toMatchObject({
      code: "insufficient_role",
    })
    expect((await resolve("admin", "admin", "admin")).actorRole).toBe("admin")
  })
})
