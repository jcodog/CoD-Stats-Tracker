import {
  getAssignableRolesForActorRole,
  isAdminCapableRole,
  type AssignableUserRole,
  type UserRole,
} from "./staffRoles"
import type { StaffManagementUserRecord } from "./staffTypes"

const ROLE_PRIORITY: Record<UserRole, number> = {
  user: 0,
  staff: 1,
  admin: 2,
  super_admin: 3,
}

function getHighestManagementRole(user: StaffManagementUserRecord): UserRole {
  if (user.isReservedSuperAdmin) {
    return "super_admin"
  }

  const roles = [user.clerkRole, user.convexRole].filter(
    (role): role is UserRole => Boolean(role)
  )

  if (roles.length === 0) {
    return "user"
  }

  return roles.reduce((highestRole, role) =>
    ROLE_PRIORITY[role] > ROLE_PRIORITY[highestRole] ? role : highestRole
  )
}

export function hasAdminCapableRoleForManagementUser(
  user: StaffManagementUserRecord
) {
  return (
    isAdminCapableRole(user.clerkRole) ||
    isAdminCapableRole(user.convexRole) ||
    user.isReservedSuperAdmin
  )
}

export function getAllowedRoleOptionsForManagementUser(args: {
  actorRole: UserRole
  user: StaffManagementUserRecord
}) {
  if (args.user.isCurrentUser || args.user.isReservedSuperAdmin || !args.user.hasConvexUser) {
    return [] as readonly AssignableUserRole[]
  }

  if (args.actorRole === "super_admin") {
    return getAssignableRolesForActorRole(args.actorRole)
  }

  if (
    args.actorRole === "admin" &&
    !hasAdminCapableRoleForManagementUser(args.user)
  ) {
    return getAssignableRolesForActorRole(args.actorRole)
  }

  return [] as readonly AssignableUserRole[]
}

export function canActorBanManagementUser(args: {
  actorRole: UserRole
  user: StaffManagementUserRecord
}) {
  if (args.user.isCurrentUser || args.user.isReservedSuperAdmin) {
    return false
  }

  const highestRole = getHighestManagementRole(args.user)

  if (highestRole === "super_admin") {
    return false
  }

  if (args.actorRole === "super_admin") {
    return true
  }

  if (args.actorRole === "admin") {
    return highestRole === "user" || highestRole === "staff"
  }

  if (args.actorRole === "staff") {
    return highestRole === "user"
  }

  return false
}

export function getBanRestrictionMessageForManagementUser(args: {
  actorRole: UserRole
  user: StaffManagementUserRecord
}) {
  if (args.user.isCurrentUser) {
    return "You cannot ban your own account from the staff dashboard."
  }

  if (args.user.isReservedSuperAdmin) {
    return "Reserved super-admin accounts must be managed in configuration, not from this dashboard."
  }

  const highestRole = getHighestManagementRole(args.user)

  if (highestRole === "super_admin") {
    return "Super-admin accounts cannot be banned from the staff dashboard."
  }

  if (args.actorRole === "admin") {
    return "Admins can only ban user or staff accounts."
  }

  if (args.actorRole === "staff") {
    return "Staff can only ban standard user accounts."
  }

  return "This account cannot be banned from your current operator role."
}
