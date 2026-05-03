"use node"

import { syncClerkPublicMetadataRole } from "./clerk"
import { resolveConfiguredUserRole } from "./staffRoleConfig"
import {
  getParsedUserRoleState,
  roleMeetsRequirement,
  type RequiredStaffRole as StaffRoleRequirement,
  type UserRole,
} from "./staffRoles"

export type RequiredStaffRole = StaffRoleRequirement

export class StaffAuthorizationError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 403) {
    super(message)
    this.code = code
    this.status = status
  }
}

type ClerkStaffUserLike = {
  emailAddresses?: Array<{ emailAddress?: string | null }> | null
  firstName?: string | null
  lastName?: string | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
  publicMetadata?: { role?: unknown } | null
  username?: string | null
}

type ConvexStaffUserLike = {
  _id: string
  clerkUserId: string
  discordId?: string
  role?: string
}

function getPrimaryEmail(clerkUser: {
  emailAddresses?: Array<{ emailAddress?: string | null }> | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
}) {
  return (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    undefined
  )
}

function getDisplayName(clerkUser: {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
}) {
  const firstName = clerkUser.firstName?.trim()
  const lastName = clerkUser.lastName?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

  return fullName || clerkUser.username?.trim() || "Staff user"
}

export type AuthorizedStaffActionContext = {
  actorClerkUserId: string
  actorDisplayName: string
  actorEmail?: string
  actorRole: UserRole
  actorUserId: string
}

export async function resolveAuthorizedStaffAction(args: {
  clerkUser: ClerkStaffUserLike
  clerkUserId: string
  dbUser: ConvexStaffUserLike | null
  requiredRole: RequiredStaffRole
}): Promise<AuthorizedStaffActionContext> {
  const clerkRoleState = getParsedUserRoleState(args.clerkUser.publicMetadata?.role)

  if (!args.dbUser) {
    throw new StaffAuthorizationError(
      "missing_convex_user",
      "Your Convex user record could not be found. Staff access is denied until it is repaired."
    )
  }

  const convexRoleState = getParsedUserRoleState(args.dbUser.role)
  const convexRole = resolveConfiguredUserRole({
    discordId: args.dbUser.discordId,
    role: convexRoleState.role,
  })

  if (!convexRole) {
    throw new StaffAuthorizationError(
      convexRoleState.issue === "invalid"
        ? "invalid_convex_role"
        : "missing_convex_role",
      "Your Convex role is missing or invalid. Staff access is denied until it is repaired."
    )
  }

  let resolvedClerkRole = clerkRoleState.role

  if (resolvedClerkRole !== convexRole) {
    try {
      await syncClerkPublicMetadataRole({
        clerkUserId: args.clerkUserId,
        currentPublicMetadata: args.clerkUser.publicMetadata,
        role: convexRole,
      })
      resolvedClerkRole = convexRole
    } catch {
      resolvedClerkRole = clerkRoleState.role
    }
  }

  if (!resolvedClerkRole) {
    throw new StaffAuthorizationError(
      clerkRoleState.issue === "invalid"
        ? "invalid_clerk_role"
        : "missing_clerk_role",
      "Your Clerk public metadata role is missing or invalid. Staff access is denied until it is repaired."
    )
  }

  if (resolvedClerkRole !== convexRole) {
    throw new StaffAuthorizationError(
      "role_mismatch",
      "Your Clerk role and Convex role do not match. Staff access is denied until they are synchronized."
    )
  }

  if (!roleMeetsRequirement(convexRole, args.requiredRole)) {
    throw new StaffAuthorizationError(
      "insufficient_role",
      "You do not have the required staff role to perform this action."
    )
  }

  return {
    actorClerkUserId: args.dbUser.clerkUserId,
    actorDisplayName: getDisplayName(args.clerkUser),
    actorEmail: getPrimaryEmail(args.clerkUser),
    actorRole: convexRole,
    actorUserId: args.dbUser._id,
  }
}
