"use node"

import Stripe from "stripe"
import { v } from "convex/values"

import { internal } from "../../_generated/api"
import { action } from "../../_generated/server"
import { getStripeScheduleId } from "../../../src/lib/stripe/billing"
import { getClerkBackendClient } from "../../../src/lib/clerk"
import { requireAuthorizedStaffAction } from "../../../src/lib/staffActionAuth"
import { isConfiguredSuperAdminDiscordId } from "../../../src/lib/staffRoleConfig"
import {
  isAdminCapableRole,
  parseUserRole,
  type AssignableUserRole,
  type UserRole,
} from "../../../src/lib/staffRoles"
import {
  canActorBanManagementUser,
  getAllowedRoleOptionsForManagementUser,
  getBanRestrictionMessageForManagementUser,
} from "../../../src/lib/staffManagementPermissions"
import type {
  StaffAuditLogEntry,
  StaffManagementDashboard,
  StaffManagementUserRecord,
  StaffMutationResponse,
} from "../../../src/lib/staffTypes"
import { getStripe } from "../../../src/lib/stripe/client"

type ClerkListUserRecord = Awaited<
  ReturnType<ReturnType<typeof getClerkBackendClient>["users"]["getUserList"]>
>["data"][number]

function getClerkDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
}) {
  const firstName = user.firstName?.trim()
  const lastName = user.lastName?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

  return fullName || user.username?.trim() || "Unknown user"
}

function getClerkEmail(user: {
  emailAddresses?: Array<{ emailAddress?: string | null }> | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
}) {
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    undefined
  )
}

function mapAuditLogEntry(log: {
  _id: string
  action: string
  actorClerkUserId: string
  actorName: string
  actorRole: UserRole
  createdAt: number
  details?: string
  entityId: string
  entityLabel?: string
  entityType: string
  result: "error" | "success" | "warning"
  summary: string
}): StaffAuditLogEntry {
  return {
    action: log.action,
    actorClerkUserId: log.actorClerkUserId,
    actorName: log.actorName,
    actorRole: log.actorRole,
    createdAt: log.createdAt,
    details: log.details,
    entityId: log.entityId,
    entityLabel: log.entityLabel,
    entityType: log.entityType,
    id: log._id,
    result: log.result,
    summary: log.summary,
  }
}

function getRoleStatus(args: {
  clerkRole: UserRole | null
  convexRole: UserRole | null
}) {
  if (!args.clerkRole && !args.convexRole) {
    return "missing_both" as const
  }

  if (!args.clerkRole) {
    return "missing_clerk" as const
  }

  if (!args.convexRole) {
    return "missing_convex" as const
  }

  if (args.clerkRole !== args.convexRole) {
    return "mismatch" as const
  }

  return "matched" as const
}

async function listAllClerkUsers() {
  const clerkClient = getClerkBackendClient()
  const users: ClerkListUserRecord[] = []
  const pageSize = 100

  for (let offset = 0; ; offset += pageSize) {
    const page = await clerkClient.users.getUserList({
      limit: pageSize,
      offset,
    })

    if (!page.data.length) {
      break
    }

    users.push(...page.data)

    if (page.data.length < pageSize) {
      break
    }
  }

  return users
}

function buildManagementUsers(args: {
  clerkUsers: ClerkListUserRecord[]
  currentActorClerkUserId: string
  convexUsers: Array<{
    clerkUserId: string
    discordId: string
    name: string
    role?: UserRole
    status: "active" | "disabled"
  }>
}) {
  const clerkUsersById = new Map(
    args.clerkUsers.map((clerkUser) => [clerkUser.id, clerkUser])
  )
  const convexUsersById = new Map(
    args.convexUsers.map((convexUser) => [convexUser.clerkUserId, convexUser])
  )
  const userIds = new Set<string>([
    ...clerkUsersById.keys(),
    ...convexUsersById.keys(),
  ])
  const users: StaffManagementUserRecord[] = []

  for (const clerkUserId of userIds) {
    const clerkUser = clerkUsersById.get(clerkUserId)
    const convexUser = convexUsersById.get(clerkUserId)
    const clerkRole = parseUserRole(clerkUser?.publicMetadata?.role)
    const convexRole = parseUserRole(convexUser?.role)
    const displayName =
      (clerkUser && getClerkDisplayName(clerkUser)) ||
      convexUser?.name ||
      clerkUserId

    users.push({
      clerkRole,
      clerkUserId,
      convexRole,
      displayName,
      email: clerkUser ? getClerkEmail(clerkUser) : undefined,
      hasConvexUser: Boolean(convexUser),
      isReservedSuperAdmin: convexUser
        ? isConfiguredSuperAdminDiscordId(convexUser.discordId)
        : false,
      isCurrentUser: clerkUserId === args.currentActorClerkUserId,
      roleStatus: getRoleStatus({ clerkRole, convexRole }),
      status: convexUser?.status ?? "unknown",
    })
  }

  return users.sort(
    (left, right) =>
      left.displayName.localeCompare(right.displayName) ||
      left.clerkUserId.localeCompare(right.clerkUserId)
  )
}

function buildRoleChangeDetails(args: {
  nextRole: AssignableUserRole
  previousClerkRole: UserRole | null
  previousConvexRole: UserRole | null
}) {
  return JSON.stringify(
    {
      after: {
        clerkRole: args.nextRole,
        convexRole: args.nextRole,
      },
      before: {
        clerkRole: args.previousClerkRole,
        convexRole: args.previousConvexRole,
      },
    },
    null,
    2
  )
}

function countAlignedAdmins(users: StaffManagementUserRecord[]) {
  return users.filter(
    (user) =>
      user.roleStatus === "matched" && isAdminCapableRole(user.convexRole)
  ).length
}

function getMetadataStripeCustomerId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  const metadata = value as Record<string, unknown>
  const directValue = metadata.stripeCustomerId

  if (
    typeof directValue === "string" &&
    directValue.trim().startsWith("cus_")
  ) {
    return directValue.trim()
  }

  const billingValue = metadata.billing

  if (
    !billingValue ||
    typeof billingValue !== "object" ||
    Array.isArray(billingValue)
  ) {
    return undefined
  }

  const nestedValue = (billingValue as Record<string, unknown>).stripeCustomerId

  if (
    typeof nestedValue === "string" &&
    nestedValue.trim().startsWith("cus_")
  ) {
    return nestedValue.trim()
  }

  return undefined
}

function getTargetStatsUserIds(args: {
  clerkUserId: string
  discordId?: string
}) {
  return Array.from(
    new Set(
      [args.clerkUserId, args.discordId]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  )
}

function isCancelableStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
) {
  return status !== "canceled" && status !== "incomplete_expired"
}

async function releaseStripeScheduleIfPresent(args: {
  stripe: Stripe
  stripeScheduleId?: string
}) {
  if (!args.stripeScheduleId) {
    return
  }

  try {
    await args.stripe.subscriptionSchedules.release(args.stripeScheduleId)
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      return
    }

    throw error
  }
}

async function listStripeSubscriptionsForCustomer(args: {
  stripe: Stripe
  stripeCustomerId: string
}) {
  const subscriptions: Stripe.Subscription[] = []

  for await (const subscription of args.stripe.subscriptions.list({
    customer: args.stripeCustomerId,
    limit: 100,
    status: "all",
  })) {
    subscriptions.push(subscription)
  }

  return subscriptions
}

async function cancelStripeCustomerSubscriptions(args: {
  stripe: Stripe
  stripeCustomerId: string
}) {
  const subscriptions = await listStripeSubscriptionsForCustomer(args)
  const canceledSubscriptionIds: string[] = []
  const skippedSubscriptionIds: string[] = []

  for (const subscription of subscriptions) {
    if (!isCancelableStripeSubscriptionStatus(subscription.status)) {
      skippedSubscriptionIds.push(subscription.id)
      continue
    }

    await releaseStripeScheduleIfPresent({
      stripe: args.stripe,
      stripeScheduleId: getStripeScheduleId(subscription.schedule),
    })

    await args.stripe.subscriptions.cancel(subscription.id, {
      invoice_now: false,
      prorate: false,
    })
    canceledSubscriptionIds.push(subscription.id)
  }

  return {
    canceledSubscriptionIds,
    skippedSubscriptionIds,
  }
}

async function deleteStripeCustomerIfPresent(args: {
  stripe: Stripe
  stripeCustomerId: string
}) {
  try {
    await args.stripe.customers.del(args.stripeCustomerId)
    return true
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      return false
    }

    throw error
  }
}

async function recordAuditLog(args: {
  action: string
  actorClerkUserId: string
  actorName: string
  actorRole: UserRole
  ctx: Parameters<typeof requireAuthorizedStaffAction>[0]
  details?: string
  entityId: string
  entityLabel?: string
  entityType: string
  result: "error" | "success" | "warning"
  summary: string
}) {
  await args.ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
    action: args.action,
    actorClerkUserId: args.actorClerkUserId,
    actorName: args.actorName,
    actorRole: args.actorRole,
    details: args.details,
    entityId: args.entityId,
    entityLabel: args.entityLabel,
    entityType: args.entityType,
    result: args.result,
    summary: args.summary,
  })
}

export const getDashboard = action({
  args: {},
  handler: async (ctx): Promise<StaffManagementDashboard> => {
    const operator = await requireAuthorizedStaffAction(ctx, "staff")
    const [records, clerkUsers] = await Promise.all([
      ctx.runQuery(internal.queries.staff.internal.getManagementRecords, {}),
      listAllClerkUsers(),
    ])
    const users = buildManagementUsers({
      clerkUsers,
      convexUsers: records.users,
      currentActorClerkUserId: operator.actorClerkUserId,
    })

    return {
      adminCount: users.filter((user) => user.convexRole === "admin").length,
      auditLogs: records.roleAuditLogs.map(mapAuditLogEntry),
      currentActorClerkUserId: operator.actorClerkUserId,
      currentActorRole: operator.actorRole,
      generatedAt: Date.now(),
      staffCount: users.filter(
        (user) => user.convexRole && user.convexRole !== "user"
      ).length,
      superAdminCount: users.filter((user) => user.convexRole === "super_admin")
        .length,
      users,
    }
  },
})

export const updateUserRole = action({
  args: {
    nextRole: v.union(
      v.literal("user"),
      v.literal("staff"),
      v.literal("admin")
    ),
    targetClerkUserId: v.string(),
  },
  handler: async (ctx, args): Promise<StaffMutationResponse> => {
    const operator = await requireAuthorizedStaffAction(ctx, "admin")
    const [records, clerkUsers] = await Promise.all([
      ctx.runQuery(internal.queries.staff.internal.getManagementRecords, {}),
      listAllClerkUsers(),
    ])
    const users = buildManagementUsers({
      clerkUsers,
      convexUsers: records.users,
      currentActorClerkUserId: operator.actorClerkUserId,
    })
    const targetUser = users.find(
      (user) => user.clerkUserId === args.targetClerkUserId
    )

    if (!targetUser) {
      throw new Error(`Unable to find Clerk user ${args.targetClerkUserId}`)
    }

    if (!targetUser.hasConvexUser) {
      throw new Error(
        "This user does not have a Convex user record yet, so their role cannot be synchronized safely."
      )
    }

    if (targetUser.isCurrentUser) {
      throw new Error(
        "You cannot change your own role from the staff dashboard."
      )
    }

    if (targetUser.isReservedSuperAdmin) {
      throw new Error(
        "This account is a reserved super-admin from configuration and cannot be edited here."
      )
    }

    const allowedNextRoles = getAllowedRoleOptionsForManagementUser({
      actorRole: operator.actorRole,
      user: targetUser,
    })

    if (!allowedNextRoles.includes(args.nextRole)) {
      throw new Error(
        operator.actorRole === "super_admin"
          ? "Only non-reserved users can be assigned user, staff, or admin roles from this dashboard."
          : "Admins can only manage non-admin users and assign user or staff roles."
      )
    }

    const alignedAdminCount = countAlignedAdmins(users)
    const targetIsAlignedAdmin =
      targetUser.roleStatus === "matched" &&
      isAdminCapableRole(targetUser.convexRole)

    if (
      targetIsAlignedAdmin &&
      !isAdminCapableRole(args.nextRole) &&
      alignedAdminCount <= 1
    ) {
      throw new Error(
        "The last aligned admin-capable user cannot be demoted. Promote another admin first."
      )
    }

    if (
      targetUser.clerkRole === args.nextRole &&
      targetUser.convexRole === args.nextRole
    ) {
      return {
        summary: `${targetUser.displayName} is already set to ${args.nextRole}.`,
      }
    }

    const clerkClient = getClerkBackendClient()
    const clerkUser = clerkUsers.find(
      (user) => user.id === args.targetClerkUserId
    )

    if (!clerkUser) {
      throw new Error(`Unable to load Clerk user ${args.targetClerkUserId}`)
    }

    const previousPublicMetadata = { ...(clerkUser.publicMetadata ?? {}) }

    try {
      await clerkClient.users.updateUserMetadata(args.targetClerkUserId, {
        publicMetadata: {
          ...previousPublicMetadata,
          role: args.nextRole,
        },
      })

      await ctx.runMutation(internal.mutations.staff.internal.setUserRole, {
        clerkUserId: args.targetClerkUserId,
        role: args.nextRole,
      })
    } catch (error) {
      try {
        await clerkClient.users.updateUserMetadata(args.targetClerkUserId, {
          publicMetadata: previousPublicMetadata,
        })
      } catch (rollbackError) {
        await recordAuditLog({
          action: "staff.role.rollback_failed",
          actorClerkUserId: operator.actorClerkUserId,
          actorName: operator.actorDisplayName,
          actorRole: operator.actorRole,
          ctx,
          details: JSON.stringify(
            {
              message:
                rollbackError instanceof Error
                  ? rollbackError.message
                  : String(rollbackError),
              targetClerkUserId: args.targetClerkUserId,
            },
            null,
            2
          ),
          entityId: args.targetClerkUserId,
          entityLabel: targetUser.displayName,
          entityType: "user",
          result: "error",
          summary: `Role update for ${targetUser.displayName} failed and the Clerk rollback also failed.`,
        })
      }

      await recordAuditLog({
        action: "staff.role.update_failed",
        actorClerkUserId: operator.actorClerkUserId,
        actorName: operator.actorDisplayName,
        actorRole: operator.actorRole,
        ctx,
        details: JSON.stringify(
          {
            message: error instanceof Error ? error.message : String(error),
            nextRole: args.nextRole,
            previousClerkRole: targetUser.clerkRole,
            previousConvexRole: targetUser.convexRole,
          },
          null,
          2
        ),
        entityId: args.targetClerkUserId,
        entityLabel: targetUser.displayName,
        entityType: "user",
        result: "error",
        summary: `Role update for ${targetUser.displayName} to ${args.nextRole} failed.`,
      })

      throw error
    }

    await recordAuditLog({
      action: "staff.role.updated",
      actorClerkUserId: operator.actorClerkUserId,
      actorName: operator.actorDisplayName,
      actorRole: operator.actorRole,
      ctx,
      details: buildRoleChangeDetails({
        nextRole: args.nextRole,
        previousClerkRole: targetUser.clerkRole,
        previousConvexRole: targetUser.convexRole,
      }),
      entityId: args.targetClerkUserId,
      entityLabel: targetUser.displayName,
      entityType: "user",
      result: "success",
      summary: `Updated ${targetUser.displayName} to ${args.nextRole}.`,
    })

    return {
      summary: `Updated ${targetUser.displayName} to ${args.nextRole}.`,
    }
  },
})

export const banUser = action({
  args: {
    targetClerkUserId: v.string(),
  },
  handler: async (ctx, args): Promise<StaffMutationResponse> => {
    const operator = await requireAuthorizedStaffAction(ctx, "staff")
    const [records, clerkUsers] = await Promise.all([
      ctx.runQuery(internal.queries.staff.internal.getManagementRecords, {}),
      listAllClerkUsers(),
    ])
    const users = buildManagementUsers({
      clerkUsers,
      convexUsers: records.users,
      currentActorClerkUserId: operator.actorClerkUserId,
    })
    const targetUser = users.find(
      (user) => user.clerkUserId === args.targetClerkUserId
    )

    if (!targetUser) {
      throw new Error(`Unable to find Clerk user ${args.targetClerkUserId}`)
    }

    if (
      !canActorBanManagementUser({
        actorRole: operator.actorRole,
        user: targetUser,
      })
    ) {
      throw new Error(
        getBanRestrictionMessageForManagementUser({
          actorRole: operator.actorRole,
          user: targetUser,
        })
      )
    }

    const clerkUser = clerkUsers.find(
      (user) => user.id === args.targetClerkUserId
    )
    const targetDbUser = await ctx.runQuery(
      internal.queries.staff.internal.getUserByClerkUserId,
      {
        clerkUserId: args.targetClerkUserId,
      }
    )
    const localSubscriptions: Array<{
      stripeCustomerId: string
    }> = targetDbUser
      ? await ctx.runQuery(
          internal.queries.billing.internal.listBillingSubscriptionsByUserId,
          {
            userId: targetDbUser._id,
          }
        )
      : []
    const billingContext = targetDbUser
      ? await ctx.runQuery(
          internal.queries.billing.internal.getUserBillingContextByClerkUserId,
          {
            clerkUserId: args.targetClerkUserId,
          }
        )
      : null
    const stripeCustomerIds = Array.from(
      new Set(
        [
          billingContext?.customer?.stripeCustomerId,
          ...localSubscriptions.map(
            (subscription) => subscription.stripeCustomerId
          ),
          clerkUser
            ? getMetadataStripeCustomerId(clerkUser.publicMetadata)
            : undefined,
        ].filter((value): value is string => Boolean(value))
      )
    )
    const targetStatsUserIds = getTargetStatsUserIds({
      clerkUserId: args.targetClerkUserId,
      discordId: targetDbUser?.discordId,
    })
    const stripe = getStripe()
    const clerkClient = getClerkBackendClient()
    const stripeCleanup: Array<{
      canceledSubscriptionIds: string[]
      customerDeleted: boolean
      skippedSubscriptionIds: string[]
      stripeCustomerId: string
    }> = []

    try {
      for (const stripeCustomerId of stripeCustomerIds) {
        const canceledSubscriptions = await cancelStripeCustomerSubscriptions({
          stripe,
          stripeCustomerId,
        })
        const customerDeleted = await deleteStripeCustomerIfPresent({
          stripe,
          stripeCustomerId,
        })

        stripeCleanup.push({
          ...canceledSubscriptions,
          customerDeleted,
          stripeCustomerId,
        })
      }

      if (clerkUser) {
        await clerkClient.users.banUser(args.targetClerkUserId)
      }

      const purgeResult = await ctx.runMutation(
        internal.mutations.staff.management.purgeBannedUserData,
        {
          targetClerkUserId: args.targetClerkUserId,
          targetDiscordUserId: targetDbUser?.discordId,
          targetStatsUserIds,
          targetUserId: targetDbUser?._id,
        }
      )

      await ctx.runMutation(
        internal.mutations.stats.landingMetrics.rebuildLandingMetrics,
        {}
      )

      await recordAuditLog({
        action: "staff.user.banned",
        actorClerkUserId: operator.actorClerkUserId,
        actorName: operator.actorDisplayName,
        actorRole: operator.actorRole,
        ctx,
        details: JSON.stringify(
          {
            clerkAccountBanned: Boolean(clerkUser),
            deletedCounts: purgeResult.deletedCounts,
            stripeCleanup,
            targetClerkUserId: args.targetClerkUserId,
            targetDiscordUserId: targetDbUser?.discordId,
            targetStatsUserIds,
            targetUserDeleted: purgeResult.userDeleted,
          },
          null,
          2
        ),
        entityId: args.targetClerkUserId,
        entityLabel: targetUser.displayName,
        entityType: "user",
        result: "success",
        summary: `Banned ${targetUser.displayName}, canceled billing, and removed their CodStats data.`,
      })

      return {
        summary: `Banned ${targetUser.displayName} and removed their CodStats data.`,
      }
    } catch (error) {
      await recordAuditLog({
        action: "staff.user.ban_failed",
        actorClerkUserId: operator.actorClerkUserId,
        actorName: operator.actorDisplayName,
        actorRole: operator.actorRole,
        ctx,
        details: JSON.stringify(
          {
            message: error instanceof Error ? error.message : String(error),
            stripeCleanup,
            targetClerkUserId: args.targetClerkUserId,
            targetDiscordUserId: targetDbUser?.discordId,
            targetStatsUserIds,
            targetUserId: targetDbUser?._id,
          },
          null,
          2
        ),
        entityId: args.targetClerkUserId,
        entityLabel: targetUser.displayName,
        entityType: "user",
        result: "error",
        summary: `Ban flow for ${targetUser.displayName} failed.`,
      })

      throw error
    }
  },
})
