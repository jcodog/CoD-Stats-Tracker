import { v } from "convex/values"

import type { Doc, Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"

function dedupeDocs<T extends { _id: string }>(documents: T[]) {
  const dedupedDocuments = new Map<string, T>()

  for (const document of documents) {
    dedupedDocuments.set(document._id, document)
  }

  return Array.from(dedupedDocuments.values())
}

async function collectOwnedSessions(args: {
  ctx: MutationCtx
  targetStatsUserIds: string[]
  targetUserId?: Id<"users">
}) {
  const [ownerSessions, ...legacySessionGroups] = await Promise.all([
    args.targetUserId
      ? args.ctx.db
          .query("sessions")
          .withIndex("by_owner_startedAt", (query) =>
            query.eq("ownerUserId", args.targetUserId!)
          )
          .collect()
      : Promise.resolve([] as Doc<"sessions">[]),
    ...Array.from(new Set(args.targetStatsUserIds)).map((candidate) =>
      args.ctx.db
        .query("sessions")
        .withIndex("by_user", (query) => query.eq("userId", candidate))
        .collect()
    ),
  ])

  return dedupeDocs([...ownerSessions, ...legacySessionGroups.flat()])
}

async function collectOwnedGames(args: {
  ctx: MutationCtx
  sessionUuids: string[]
  targetStatsUserIds: string[]
}) {
  const [sessionGameGroups, ...legacyGameGroups] = await Promise.all([
    ...args.sessionUuids.map((sessionUuid) =>
      args.ctx.db
        .query("games")
        .withIndex("by_session", (query) => query.eq("sessionId", sessionUuid))
        .collect()
    ),
    ...Array.from(new Set(args.targetStatsUserIds)).map((candidate) =>
      args.ctx.db
        .query("games")
        .withIndex("by_user_createdat", (query) => query.eq("userId", candidate))
        .collect()
    ),
  ])

  return dedupeDocs([...sessionGameGroups.flat(), ...legacyGameGroups.flat()])
}

async function deleteOwnedViewerQueues(args: {
  ctx: MutationCtx
  targetUserId?: Id<"users">
}) {
  if (!args.targetUserId) {
    return {
      deletedQueueCount: 0,
      deletedQueueEntryCount: 0,
      deletedQueueMessageSyncCount: 0,
      deletedQueueRoundCount: 0,
      ownedQueueIds: new Set<Id<"viewerQueues">>(),
    }
  }

  const queues = await args.ctx.db
    .query("viewerQueues")
    .withIndex("by_creatorUserId", (query) =>
      query.eq("creatorUserId", args.targetUserId!)
    )
    .collect()

  if (queues.length === 0) {
    return {
      deletedQueueCount: 0,
      deletedQueueEntryCount: 0,
      deletedQueueMessageSyncCount: 0,
      deletedQueueRoundCount: 0,
      ownedQueueIds: new Set<Id<"viewerQueues">>(),
    }
  }

  const queueIds = queues.map((queue) => queue._id)
  const [entryGroups, roundGroups, allMessageSyncs] = await Promise.all([
    Promise.all(
      queueIds.map((queueId) =>
        args.ctx.db
          .query("viewerQueueEntries")
          .withIndex("by_queueId", (query) => query.eq("queueId", queueId))
          .collect()
      )
    ),
    Promise.all(
      queueIds.map((queueId) =>
        args.ctx.db
          .query("viewerQueueRounds")
          .withIndex("by_queueId", (query) => query.eq("queueId", queueId))
          .collect()
      )
    ),
    args.ctx.db.query("viewerQueueMessageSyncs").collect(),
  ])
  const queueIdSet = new Set(queueIds)
  const messageSyncs = allMessageSyncs.filter((sync) => queueIdSet.has(sync.queueId))
  const entries = entryGroups.flat()
  const rounds = roundGroups.flat()

  for (const entry of entries) {
    await args.ctx.db.delete(entry._id)
  }

  for (const round of rounds) {
    await args.ctx.db.delete(round._id)
  }

  for (const sync of messageSyncs) {
    await args.ctx.db.delete(sync._id)
  }

  for (const queue of queues) {
    await args.ctx.db.delete(queue._id)
  }

  return {
    deletedQueueCount: queues.length,
    deletedQueueEntryCount: entries.length,
    deletedQueueMessageSyncCount: messageSyncs.length,
    deletedQueueRoundCount: rounds.length,
    ownedQueueIds: queueIdSet,
  }
}

async function scrubViewerParticipation(args: {
  ctx: MutationCtx
  ownedQueueIds: Set<Id<"viewerQueues">>
  targetDiscordUserId?: string
}) {
  if (!args.targetDiscordUserId) {
    return {
      deletedEntryCount: 0,
      deletedRoundCount: 0,
      updatedRoundCount: 0,
    }
  }

  const [allEntries, allRounds] = await Promise.all([
    args.ctx.db.query("viewerQueueEntries").collect(),
    args.ctx.db.query("viewerQueueRounds").collect(),
  ])
  const deletedRoundIds = new Set<Id<"viewerQueueRounds">>()
  const affectedQueueIds = new Set<Id<"viewerQueues">>()
  let deletedEntryCount = 0
  let deletedRoundCount = 0
  let updatedRoundCount = 0

  for (const entry of allEntries) {
    if (
      entry.discordUserId !== args.targetDiscordUserId ||
      args.ownedQueueIds.has(entry.queueId)
    ) {
      continue
    }

    await args.ctx.db.delete(entry._id)
    deletedEntryCount += 1
  }

  for (const round of allRounds) {
    if (args.ownedQueueIds.has(round.queueId)) {
      continue
    }

    const nextSelectedUsers = round.selectedUsers.filter(
      (selectedUser) => selectedUser.discordUserId !== args.targetDiscordUserId
    )

    if (nextSelectedUsers.length === round.selectedUsers.length) {
      continue
    }

    affectedQueueIds.add(round.queueId)

    if (nextSelectedUsers.length === 0) {
      await args.ctx.db.delete(round._id)
      deletedRoundIds.add(round._id)
      deletedRoundCount += 1
      continue
    }

    await args.ctx.db.patch(round._id, {
      selectedCount: nextSelectedUsers.length,
      selectedUsers: nextSelectedUsers,
    })
    updatedRoundCount += 1
  }

  for (const queueId of affectedQueueIds) {
    const queue = await args.ctx.db.get(queueId)

    if (!queue || !queue.lastSelectedRoundId) {
      continue
    }

    if (deletedRoundIds.has(queue.lastSelectedRoundId)) {
      await args.ctx.db.patch(queue._id, {
        lastSelectedRoundId: undefined,
        updatedAt: Date.now(),
      })
    }
  }

  return {
    deletedEntryCount,
    deletedRoundCount,
    updatedRoundCount,
  }
}

export const purgeBannedUserData = internalMutation({
  args: {
    targetClerkUserId: v.string(),
    targetDiscordUserId: v.optional(v.string()),
    targetStatsUserIds: v.array(v.string()),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const statsUserIds = Array.from(new Set(args.targetStatsUserIds))
    const [targetUser, activisionUsernames, billingAccessGrants, billingCustomers, billingEntitlements, billingInvoices, billingPaymentMethods, billingSubscriptions, chatgptConnections, oauthTokens, ownedQueueCleanup, ownedSessions, oauthAuthCodes, landingStats] = await Promise.all([
      args.targetUserId ? ctx.db.get(args.targetUserId) : Promise.resolve(null),
      args.targetUserId
        ? ctx.db
            .query("activisionUsernames")
            .withIndex("by_owner", (query) => query.eq("ownerUserId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"activisionUsernames">[]),
      args.targetUserId
        ? ctx.db
            .query("billingAccessGrants")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"billingAccessGrants">[]),
      args.targetUserId
        ? ctx.db
            .query("billingCustomers")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"billingCustomers">[]),
      args.targetUserId
        ? ctx.db
            .query("billingEntitlements")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"billingEntitlements">[]),
      args.targetUserId
        ? ctx.db
            .query("billingInvoices")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"billingInvoices">[]),
      args.targetUserId
        ? ctx.db
            .query("billingPaymentMethods")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"billingPaymentMethods">[]),
      args.targetUserId
        ? ctx.db
            .query("billingSubscriptions")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"billingSubscriptions">[]),
      args.targetUserId
        ? ctx.db
            .query("chatgptAppConnections")
            .withIndex("by_userId", (query) => query.eq("userId", args.targetUserId!))
            .collect()
        : Promise.resolve([] as Doc<"chatgptAppConnections">[]),
      args.targetUserId
        ? ctx.db
            .query("oauthTokens")
            .withIndex("by_user_provider", (query) =>
              query.eq("userId", args.targetUserId!).eq("provider", "chatgpt_app")
            )
            .collect()
        : Promise.resolve([] as Doc<"oauthTokens">[]),
      deleteOwnedViewerQueues({
        ctx,
        targetUserId: args.targetUserId,
      }),
      collectOwnedSessions({
        ctx,
        targetStatsUserIds: statsUserIds,
        targetUserId: args.targetUserId,
      }),
      args.targetUserId
        ? ctx.db
            .query("oauthAuthCodes")
            .collect()
            .then((codes) => codes.filter((code) => code.userId === args.targetUserId))
        : Promise.resolve([] as Doc<"oauthAuthCodes">[]),
      Promise.all(
        statsUserIds.map((statsUserId) =>
          ctx.db
            .query("landingUserStats")
            .withIndex("by_userId", (query) => query.eq("userId", statsUserId))
            .collect()
        )
      ).then((groups) => dedupeDocs(groups.flat())),
    ])
    const billingCustomerIds = new Set(
      billingCustomers.map((customer) => customer.stripeCustomerId)
    )
    const billingSubscriptionIds = new Set(
      billingSubscriptions.map((subscription) => subscription.stripeSubscriptionId)
    )
    const billingInvoiceIds = new Set(
      billingInvoices.map((invoice) => invoice.stripeInvoiceId)
    )
    const sessionUuids = ownedSessions.map((session) => session.uuid)
    const [allWebhookEvents, ownedGames, scrubbedViewerParticipation] = await Promise.all([
      billingCustomerIds.size > 0 ||
      billingSubscriptionIds.size > 0 ||
      billingInvoiceIds.size > 0
        ? ctx.db.query("billingWebhookEvents").collect()
        : Promise.resolve([] as Doc<"billingWebhookEvents">[]),
      collectOwnedGames({
        ctx,
        sessionUuids,
        targetStatsUserIds: statsUserIds,
      }),
      scrubViewerParticipation({
        ctx,
        ownedQueueIds: ownedQueueCleanup.ownedQueueIds,
        targetDiscordUserId: args.targetDiscordUserId,
      }),
    ])
    const billingWebhookEvents = allWebhookEvents.filter(
      (event) =>
        (event.customerId !== undefined &&
          billingCustomerIds.has(event.customerId)) ||
        (event.subscriptionId !== undefined &&
          billingSubscriptionIds.has(event.subscriptionId)) ||
        (event.invoiceId !== undefined &&
          billingInvoiceIds.has(event.invoiceId))
    )

    for (const game of ownedGames) {
      await ctx.db.delete(game._id)
    }

    for (const session of ownedSessions) {
      await ctx.db.delete(session._id)
    }

    for (const username of activisionUsernames) {
      await ctx.db.delete(username._id)
    }

    for (const authCode of oauthAuthCodes) {
      await ctx.db.delete(authCode._id)
    }

    for (const token of oauthTokens) {
      await ctx.db.delete(token._id)
    }

    for (const connection of chatgptConnections) {
      await ctx.db.delete(connection._id)
    }

    for (const grant of billingAccessGrants) {
      await ctx.db.delete(grant._id)
    }

    for (const entitlement of billingEntitlements) {
      await ctx.db.delete(entitlement._id)
    }

    for (const invoice of billingInvoices) {
      await ctx.db.delete(invoice._id)
    }

    for (const paymentMethod of billingPaymentMethods) {
      await ctx.db.delete(paymentMethod._id)
    }

    for (const subscription of billingSubscriptions) {
      await ctx.db.delete(subscription._id)
    }

    for (const customer of billingCustomers) {
      await ctx.db.delete(customer._id)
    }

    for (const webhookEvent of billingWebhookEvents) {
      await ctx.db.delete(webhookEvent._id)
    }

    for (const landingStat of landingStats) {
      await ctx.db.delete(landingStat._id)
    }

    if (targetUser) {
      await ctx.db.delete(targetUser._id)
    }

    return {
      deletedCounts: {
        activisionUsernames: activisionUsernames.length,
        billingAccessGrants: billingAccessGrants.length,
        billingCustomers: billingCustomers.length,
        billingEntitlements: billingEntitlements.length,
        billingInvoices: billingInvoices.length,
        billingPaymentMethods: billingPaymentMethods.length,
        billingSubscriptions: billingSubscriptions.length,
        billingWebhookEvents: billingWebhookEvents.length,
        chatgptConnections: chatgptConnections.length,
        games: ownedGames.length,
        landingStats: landingStats.length,
        oauthAuthCodes: oauthAuthCodes.length,
        oauthTokens: oauthTokens.length,
        sessions: ownedSessions.length,
        user: targetUser ? 1 : 0,
        viewerQueueEntries:
          ownedQueueCleanup.deletedQueueEntryCount +
          scrubbedViewerParticipation.deletedEntryCount,
        viewerQueueMessageSyncs: ownedQueueCleanup.deletedQueueMessageSyncCount,
        viewerQueueRounds:
          ownedQueueCleanup.deletedQueueRoundCount +
          scrubbedViewerParticipation.deletedRoundCount,
        viewerQueueRoundsUpdated: scrubbedViewerParticipation.updatedRoundCount,
        viewerQueues: ownedQueueCleanup.deletedQueueCount,
      },
      userDeleted: Boolean(targetUser),
      targetClerkUserId: args.targetClerkUserId,
    }
  },
})
