import { describe, expect, it } from "bun:test";

import {
  getAssignableRolesForActorRole,
  getParsedUserRoleState,
  isAdminCapableRole,
  parseAuditLogResult,
  parseBillingFeatureApplyMode,
  parseRequiredStaffRole,
  parseUserRole,
  resolveBillingFeatureApplyMode,
  roleMeetsRequirement,
} from "../staffRoles.ts";

describe("staff role helpers", () => {
  it("parses user roles and missing role states", () => {
    expect(parseUserRole("ADMIN")).toBe("admin");
    expect(parseUserRole("viewer")).toBeNull();
    expect(getParsedUserRoleState("  ")).toEqual({
      issue: "missing",
      role: null,
    });
    expect(getParsedUserRoleState("super_admin")).toEqual({
      issue: null,
      role: "super_admin",
    });
    expect(getParsedUserRoleState("unknown")).toEqual({
      issue: "invalid",
      role: null,
    });
  });

  it("parses elevated role, feature mode, and audit log enums", () => {
    expect(parseRequiredStaffRole("Staff")).toBe("staff");
    expect(parseRequiredStaffRole("user")).toBeNull();
    expect(parseBillingFeatureApplyMode("MARKETING")).toBe("marketing");
    expect(parseBillingFeatureApplyMode("unsupported")).toBeNull();
    expect(parseAuditLogResult("warning")).toBe("warning");
    expect(parseAuditLogResult("bad")).toBeNull();
  });

  it("checks role requirements and assignable role sets", () => {
    expect(roleMeetsRequirement("staff", "staff")).toBe(true);
    expect(roleMeetsRequirement("admin", "admin")).toBe(true);
    expect(roleMeetsRequirement("staff", "admin")).toBe(false);
    expect(isAdminCapableRole("admin")).toBe(true);
    expect(isAdminCapableRole("staff")).toBe(false);

    expect(getAssignableRolesForActorRole("super_admin")).toEqual([
      "user",
      "staff",
      "admin",
    ]);
    expect(getAssignableRolesForActorRole("admin")).toEqual(["user", "staff"]);
    expect(getAssignableRolesForActorRole("staff")).toEqual([]);
  });

  it("defaults unknown billing feature modes to both", () => {
    expect(resolveBillingFeatureApplyMode("entitlement")).toBe("entitlement");
    expect(resolveBillingFeatureApplyMode("unknown")).toBe("both");
  });
});

