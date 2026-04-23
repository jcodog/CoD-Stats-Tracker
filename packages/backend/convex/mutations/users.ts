import { v, Validator } from "convex/values"
import { internalMutation, MutationCtx } from "../_generated/server"
import type { UserJSON } from "@clerk/nextjs/server"
import { DataModel } from "../_generated/dataModel"
import { parseUserRole } from "../lib/staffRoles"
import { resolveConfiguredUserRole } from "../lib/staffRoleConfig"
import {
  getConnectedAccountsFromClerkUser,
  getDiscordIdFromClerkUser,
  resolveProvisionedUserRoleFromClerk,
} from "../lib/clerkUsers"

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  handler: async (ctx, { data }) => {
    const clerkUserId = data.id
    const discordId = getDiscordIdFromClerkUser(data)

    if (!discordId) {
      throw new Error(
        "Discord account not linked in Clerk. A Discord ID is required for CleoAI Cod Stats Service."
      )
    }

    const name = data.username ?? `Slayer ${discordId.slice(-4)}`
    const desiredRole = resolveProvisionedUserRoleFromClerk(data)
    const now = Date.now()

    const existingByClerk = await userByClerkUserId(ctx, clerkUserId)

    const existingByDiscord = await userByDiscordId(ctx, discordId)

    if (
      existingByClerk &&
      existingByDiscord &&
      existingByClerk._id !== existingByDiscord._id
    ) {
      throw new Error(
        "Account conflict: this clerk user and Discord ID are linked to different CleoAI Cod Stats Service users."
      )
    }

    const doc = existingByClerk ?? existingByDiscord

    if (!doc) {
      const userId = await ctx.db.insert("users", {
        clerkUserId,
        discordId,
        name,
        plan: "free",
        preferredMatchLoggingMode: "comprehensive",
        status: "active",
        role: desiredRole,
        cleoDashLinked: false,
        chatgptLinked: false,
        chatgptLinkedAt: undefined,
        chatgptRevokedAt: undefined,
        createdAt: now,
        updatedAt: now,
      })
      await syncConnectedAccountsForUserRecords(ctx, {
        accounts: getConnectedAccountsFromClerkUser(data),
        now,
        userId,
      })
      return
    }

    const patch: Partial<DataModel["users"]["document"]> = {}

    if (doc.clerkUserId !== clerkUserId) {
      patch.clerkUserId = clerkUserId
    }

    if (doc.discordId !== discordId) {
      patch.discordId = discordId
    }

    if (doc.name !== name) {
      patch.name = name
    }

    if (doc.status !== "active") {
      patch.status = "active"
    }

    const nextRole = resolveConfiguredUserRole({
      discordId,
      role: doc.role ?? desiredRole,
    })

    if (doc.role !== nextRole && nextRole) {
      patch.role = nextRole
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now
      await ctx.db.patch(doc._id, patch)
    }

    await syncConnectedAccountsForUserRecords(ctx, {
      accounts: getConnectedAccountsFromClerkUser(data),
      now,
      userId: doc._id,
    })

    return
  },
})

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await userByClerkUserId(ctx, clerkUserId)

    if (!user) {
      console.log(
        `Ignoring Clerk user deletion for missing local user: ${clerkUserId}`
      )
      return
    }

    const connectedAccounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_userId", (query) => query.eq("userId", user._id))
      .collect()

    for (const connectedAccount of connectedAccounts) {
      await ctx.db.delete(connectedAccount._id)
    }

    await ctx.db.delete(user._id)
  },
})

export const updateFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  handler: async (ctx, { data }) => {
    const clerkUserId = data.id

    const existing = await userByClerkUserId(ctx, clerkUserId)
    if (!existing) {
      return
    }

    const discordId = getDiscordIdFromClerkUser(data)
    if (!discordId) {
      throw new Error(
        "Discord account not linked in Clerk. A Discord ID is required for CleoAI Cod Stats Service."
      )
    }

    const name = data.username ?? `Slayer ${discordId.slice(-4)}`
    const publicMetadataRole = parseUserRole(data.public_metadata?.role)
    const nextRole = resolveConfiguredUserRole({
      discordId,
      role: existing.role ?? publicMetadataRole ?? null,
    })
    const now = Date.now()

    if (existing.discordId !== discordId) {
      const byDiscord = await userByDiscordId(ctx, discordId)
      if (byDiscord && byDiscord._id !== existing._id) {
        throw new Error(
          "Account conflict: this Discord ID is already linked to a different CleoAI Cod Stats Service user."
        )
      }
    }

    const patch: Partial<DataModel["users"]["document"]> = {}
    if (existing.discordId !== discordId) patch.discordId = discordId
    if (existing.name !== name) patch.name = name
    if (existing.clerkUserId !== clerkUserId) patch.clerkUserId = clerkUserId
    if (existing.status !== "active") patch.status = "active"
    if (existing.role !== nextRole && nextRole) {
      patch.role = nextRole
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now
      await ctx.db.patch(existing._id, patch)
    }

    await syncConnectedAccountsForUserRecords(ctx, {
      accounts: getConnectedAccountsFromClerkUser(data),
      now,
      userId: existing._id,
    })

    return
  },
})

export const syncConnectedAccountsForUser = internalMutation({
  args: {
    userId: v.id("users"),
    accounts: v.array(
      v.object({
        displayName: v.optional(v.string()),
        provider: v.union(v.literal("discord"), v.literal("twitch")),
        providerLogin: v.optional(v.string()),
        providerUserId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await syncConnectedAccountsForUserRecords(ctx, {
      accounts: args.accounts,
      now: Date.now(),
      userId: args.userId,
    })

    return { userId: args.userId }
  },
})

async function syncConnectedAccountsForUserRecords(
  ctx: MutationCtx,
  args: {
    accounts: Array<{
      displayName?: string
      provider: "discord" | "twitch"
      providerLogin?: string
      providerUserId: string
    }>
    now: number
    userId: DataModel["users"]["document"]["_id"]
  }
) {
  const existingAccounts = await ctx.db
    .query("connectedAccounts")
    .withIndex("by_userId", (query) => query.eq("userId", args.userId))
    .collect()

  const desiredAccounts = new Map(
    args.accounts.map((account) => [account.provider, account])
  )

  for (const desiredAccount of desiredAccounts.values()) {
    const conflictingAccount = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_provider_and_providerUserId", (query) =>
        query
          .eq("provider", desiredAccount.provider)
          .eq("providerUserId", desiredAccount.providerUserId)
      )
      .unique()

    if (conflictingAccount && conflictingAccount.userId !== args.userId) {
      throw new Error(
        `Account conflict: this ${desiredAccount.provider} account is already linked to a different CleoAI Cod Stats Service user.`
      )
    }

    const existingAccount = existingAccounts.find(
      (account) => account.provider === desiredAccount.provider
    )

    if (!existingAccount) {
      await ctx.db.insert("connectedAccounts", {
        createdAt: args.now,
        displayName: desiredAccount.displayName?.trim() || undefined,
        provider: desiredAccount.provider,
        providerLogin: desiredAccount.providerLogin?.trim() || undefined,
        providerUserId: desiredAccount.providerUserId.trim(),
        updatedAt: args.now,
        userId: args.userId,
      })
      continue
    }

    const patch: Partial<DataModel["connectedAccounts"]["document"]> = {}

    if (existingAccount.providerUserId !== desiredAccount.providerUserId.trim()) {
      patch.providerUserId = desiredAccount.providerUserId.trim()
    }

    if (
      (existingAccount.providerLogin ?? undefined) !==
      (desiredAccount.providerLogin?.trim() || undefined)
    ) {
      patch.providerLogin = desiredAccount.providerLogin?.trim() || undefined
    }

    if (
      (existingAccount.displayName ?? undefined) !==
      (desiredAccount.displayName?.trim() || undefined)
    ) {
      patch.displayName = desiredAccount.displayName?.trim() || undefined
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = args.now
      await ctx.db.patch(existingAccount._id, patch)
    }
  }

  for (const existingAccount of existingAccounts) {
    if (desiredAccounts.has(existingAccount.provider)) {
      continue
    }

    await ctx.db.delete(existingAccount._id)
  }
}

const userByClerkUserId = async (
  ctx: MutationCtx,
  clerkUserId: string
): Promise<DataModel["users"]["document"] | null> => {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique()
}

const userByDiscordId = async (
  ctx: MutationCtx,
  discordId: string
): Promise<DataModel["users"]["document"] | null> => {
  return await ctx.db
    .query("users")
    .withIndex("by_discordId", (q) => q.eq("discordId", discordId))
    .unique()
}
