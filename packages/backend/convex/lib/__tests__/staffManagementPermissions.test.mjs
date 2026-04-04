import { describe, expect, it } from "bun:test"

import {
  canActorBanManagementUser,
  getAllowedRoleOptionsForManagementUser,
  getBanRestrictionMessageForManagementUser,
} from "../staffManagementPermissions.ts"

function createUser(overrides = {}) {
  return {
    clerkRole: "user",
    clerkUserId: "user_123",
    convexRole: "user",
    displayName: "Test User",
    email: "test@example.com",
    hasConvexUser: true,
    isCurrentUser: false,
    isReservedSuperAdmin: false,
    roleStatus: "matched",
    status: "active",
    ...overrides,
  }
}

describe("staff management permissions", () => {
  it("blocks self-editing from role options for every operator", () => {
    const currentUser = createUser({
      clerkRole: "super_admin",
      convexRole: "super_admin",
      isCurrentUser: true,
    })

    expect(
      getAllowedRoleOptionsForManagementUser({
        actorRole: "super_admin",
        user: currentUser,
      })
    ).toEqual([])
    expect(
      getAllowedRoleOptionsForManagementUser({
        actorRole: "admin",
        user: createUser({ isCurrentUser: true }),
      })
    ).toEqual([])
  })

  it("allows admins to edit only non-admin-capable accounts", () => {
    expect(
      getAllowedRoleOptionsForManagementUser({
        actorRole: "admin",
        user: createUser({ clerkRole: "user", convexRole: "staff" }),
      })
    ).toEqual(["user", "staff"])

    expect(
      getAllowedRoleOptionsForManagementUser({
        actorRole: "admin",
        user: createUser({ clerkRole: "admin", convexRole: "user" }),
      })
    ).toEqual([])
  })

  it("enforces the ban hierarchy across staff, admins, and super-admins", () => {
    expect(
      canActorBanManagementUser({
        actorRole: "staff",
        user: createUser({ clerkRole: "user", convexRole: "user" }),
      })
    ).toBe(true)
    expect(
      canActorBanManagementUser({
        actorRole: "staff",
        user: createUser({ clerkRole: "staff", convexRole: "user" }),
      })
    ).toBe(false)

    expect(
      canActorBanManagementUser({
        actorRole: "admin",
        user: createUser({ clerkRole: "staff", convexRole: "staff" }),
      })
    ).toBe(true)
    expect(
      canActorBanManagementUser({
        actorRole: "admin",
        user: createUser({ clerkRole: "admin", convexRole: "user" }),
      })
    ).toBe(false)

    expect(
      canActorBanManagementUser({
        actorRole: "super_admin",
        user: createUser({ clerkRole: "admin", convexRole: "admin" }),
      })
    ).toBe(true)
    expect(
      canActorBanManagementUser({
        actorRole: "super_admin",
        user: createUser({ clerkRole: "super_admin", convexRole: "super_admin" }),
      })
    ).toBe(false)
  })

  it("returns operator-specific ban restriction messages", () => {
    expect(
      getBanRestrictionMessageForManagementUser({
        actorRole: "staff",
        user: createUser({ isCurrentUser: true }),
      })
    ).toMatch(/cannot ban your own account/i)

    expect(
      getBanRestrictionMessageForManagementUser({
        actorRole: "staff",
        user: createUser({ clerkRole: "staff", convexRole: "staff" }),
      })
    ).toBe("Staff can only ban standard user accounts.")

    expect(
      getBanRestrictionMessageForManagementUser({
        actorRole: "admin",
        user: createUser({ clerkRole: "admin", convexRole: "admin" }),
      })
    ).toBe("Admins can only ban user or staff accounts.")

    expect(
      getBanRestrictionMessageForManagementUser({
        actorRole: "super_admin",
        user: createUser({
          clerkRole: "super_admin",
          convexRole: "super_admin",
        }),
      })
    ).toBe("Super-admin accounts cannot be banned from the staff dashboard.")
  })
})
