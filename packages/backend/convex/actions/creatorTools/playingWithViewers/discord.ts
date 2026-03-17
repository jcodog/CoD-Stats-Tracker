"use node"

import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import type { Doc, Id } from "../../../_generated/dataModel"
import { action, internalAction, type ActionCtx } from "../../../_generated/server"
import { getClerkBackendClient } from "../../../lib/clerk"
import {
  requireCreatorToolsActionAccess,
  requireOwnedQueueActionAccess,
  requireOwnedQueueEntryActionAccess,
} from "../../../lib/creatorToolsActionAuth"
import {
  ButtonStyle,
  ChannelType,
  ComponentType,
  type RESTPatchAPIChannelMessageJSONBody,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10"

const DISCORD_API_BASE = "https://discord.com/api/v10"
const PLAY_WITH_VIEWERS_CHANNEL_NAME = "play-with-viewers"

const rankValidator = v.union(
  v.literal("bronze"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("platinum"),
  v.literal("diamond"),
  v.literal("crimson"),
  v.literal("iridescent"),
  v.literal("top250")
)

const inviteModeValidator = v.union(
  v.literal("discord_dm"),
  v.literal("manual_creator_contact")
)

type DiscordUserGuild = {
  icon: string | null
  id: string
  name: string
  owner: boolean
}

type DiscordGuildChannel = {
  id: string
  name: string
  type: ChannelType
}

type DiscordGuildSummary = {
  id: string
  name: string
}

type AvailableDiscordGuild = {
  iconUrl: string | null
  id: string
  name: string
}

type QueueRoundSelectedUser = Doc<"viewerQueueRounds">["selectedUsers"][number]

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured")
  }

  return token
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

type RenderQueueMessageArgs = {
  queue: {
    _id: string
    title: string
    creatorDisplayName: string
    gameLabel: string
    creatorMessage?: string
    rulesText?: string
    isActive: boolean
    matchesPerViewer: number
    minRank: string
    maxRank: string
    channelId: string
    messageId?: string
  }
  queueSize: number
}

function buildCustomId(
  action: "join" | "leave" | "status",
  queueId: string
): string {
  return `pwv:v1:${action}:${queueId}`
}

function renderQueueMessage({
  queue,
  queueSize,
}: RenderQueueMessageArgs):
  | RESTPostAPIChannelMessageJSONBody
  | RESTPatchAPIChannelMessageJSONBody {
  const descriptionLines = [
    `**Status:** ${queue.isActive ? "Open" : "Closed"}`,
    `**Game:** ${queue.gameLabel}`,
    `**Matches per viewer:** ${queue.matchesPerViewer}`,
    `**Allowed ranks:** ${queue.minRank} → ${queue.maxRank}`,
    `**Queue size:** ${queueSize}`,
  ]

  if (queue.creatorMessage?.trim()) {
    descriptionLines.push("", queue.creatorMessage.trim())
  }

  if (queue.rulesText?.trim()) {
    descriptionLines.push("", "**Rules:**", queue.rulesText.trim())
  }

  return {
    embeds: [
      {
        title: queue.title || `Play with ${queue.creatorDisplayName}`,
        description: descriptionLines.join("\n"),
      },
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: "Join Queue",
            custom_id: buildCustomId("join", queue._id),
            disabled: !queue.isActive,
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "Leave Queue",
            custom_id: buildCustomId("leave", queue._id),
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "My Status",
            custom_id: buildCustomId("status", queue._id),
          },
        ],
      },
    ],
    allowed_mentions: {
      parse: [],
    },
  }
}

async function discordRequest(args: {
  init: RequestInit
  path: string
  token: string
  tokenPrefix: "Bearer" | "Bot"
}): Promise<Response> {
  return fetch(`${DISCORD_API_BASE}${args.path}`, {
    ...args.init,
    headers: {
      Authorization: `${args.tokenPrefix} ${args.token}`,
      "Content-Type": "application/json",
      ...(args.init.headers ?? {}),
    },
  })
}

async function discordBotRequest(
  path: string,
  init: RequestInit
): Promise<Response> {
  return discordRequest({
    init,
    path,
    token: getBotToken(),
    tokenPrefix: "Bot",
  })
}

async function discordUserRequest(
  path: string,
  init: RequestInit,
  accessToken: string
): Promise<Response> {
  return discordRequest({
    init,
    path,
    token: accessToken,
    tokenPrefix: "Bearer",
  })
}

function buildGuildIconUrl(guild: DiscordUserGuild) {
  if (!guild.icon) {
    return null
  }

  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
}

async function getDiscordOauthAccessToken(clerkUserId: string) {
  const oauthTokens = await getClerkBackendClient().users.getUserOauthAccessToken(
    clerkUserId,
    "discord"
  )
  const oauthToken =
    oauthTokens.data.find((candidate) => candidate.scopes?.includes("guilds")) ??
    oauthTokens.data[0]

  if (!oauthToken?.token) {
    throw new Error("Connect Discord to this account before creating a queue.")
  }

  if (!(oauthToken.scopes?.includes("guilds") ?? false)) {
    throw new Error(
      "Reconnect Discord with server access enabled so owned servers can be loaded."
    )
  }

  return oauthToken.token
}

async function listOwnedGuildsWithBot(clerkUserId: string) {
  const discordOauthToken = await getDiscordOauthAccessToken(clerkUserId)
  const guildsResponse = await discordUserRequest(
    "/users/@me/guilds",
    {
      method: "GET",
    },
    discordOauthToken
  )

  if (!guildsResponse.ok) {
    const errorText = await guildsResponse.text()

    throw new Error(`Failed to load Discord servers: ${errorText}`)
  }

  const guilds = (await guildsResponse.json()) as DiscordUserGuild[]
  const ownedGuilds = guilds.filter((guild) => guild.owner)
  const availableGuilds = await Promise.all(
    ownedGuilds.map(async (guild) => {
      const botMembershipResponse = await discordBotRequest(
        `/guilds/${guild.id}`,
        {
          method: "GET",
        }
      )

      if (!botMembershipResponse.ok) {
        return null
      }

      return {
        iconUrl: buildGuildIconUrl(guild),
        id: guild.id,
        name: guild.name,
      } satisfies AvailableDiscordGuild
    })
  )

  return availableGuilds
    .filter((guild): guild is AvailableDiscordGuild => guild !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
}

async function getOrCreateQueueChannel(guildId: string) {
  const listChannelsResponse = await discordBotRequest(`/guilds/${guildId}/channels`, {
    method: "GET",
  })

  if (!listChannelsResponse.ok) {
    const errorText = await listChannelsResponse.text()

    throw new Error(`Failed to inspect server channels: ${errorText}`)
  }

  const channels = (await listChannelsResponse.json()) as DiscordGuildChannel[]
  const existingChannel = channels.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name.toLowerCase() === PLAY_WITH_VIEWERS_CHANNEL_NAME
  )

  if (existingChannel) {
    return {
      channelId: existingChannel.id,
      channelName: existingChannel.name,
      reusedChannel: true,
    }
  }

  const createChannelResponse = await discordBotRequest(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      name: PLAY_WITH_VIEWERS_CHANNEL_NAME,
      type: ChannelType.GuildText,
    }),
  })

  if (!createChannelResponse.ok) {
    const errorText = await createChannelResponse.text()

    throw new Error(`Failed to create the Play With Viewers channel: ${errorText}`)
  }

  const createdChannel = (await createChannelResponse.json()) as DiscordGuildChannel

  return {
    channelId: createdChannel.id,
    channelName: createdChannel.name,
    reusedChannel: false,
  }
}

async function getDiscordQueueContext(args: {
  channelId: string
  guildId: string
}) {
  const [guildResponse, channelResponse] = await Promise.all([
    discordBotRequest(`/guilds/${args.guildId}`, {
      method: "GET",
    }),
    discordBotRequest(`/channels/${args.channelId}`, {
      method: "GET",
    }),
  ])

  if (!guildResponse.ok) {
    const errorText = await guildResponse.text()

    throw new Error(`Failed to load Discord server details: ${errorText}`)
  }

  if (!channelResponse.ok) {
    const errorText = await channelResponse.text()

    throw new Error(`Failed to load Discord channel details: ${errorText}`)
  }

  const guild = (await guildResponse.json()) as DiscordGuildSummary
  const channel = (await channelResponse.json()) as DiscordGuildChannel

  return {
    channelName: channel.name,
    guildName: guild.name,
  }
}

async function publishQueueMessageForQueue(
  ctx: ActionCtx,
  queueId: Id<"viewerQueues">
) {
  const queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    { queueId }
  )

  const entries = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueEntries,
    { queueId }
  )

  const payload: RESTPostAPIChannelMessageJSONBody = renderQueueMessage({
    queue,
    queueSize: entries.length,
  }) as RESTPostAPIChannelMessageJSONBody

  try {
    const response = await discordBotRequest(`/channels/${queue.channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(`Failed to publish queue message: ${errorText}`)
    }

    const createdMessage = (await response.json()) as { id: string }

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueMessageMeta,
      {
        queueId,
        messageId: createdMessage.id,
      }
    )

    return {
      messageId: createdMessage.id,
      ok: true,
    }
  } catch (error) {
    const errorMessage = toErrorMessage(error, "Failed to publish queue message.")

    console.error("Play With Viewers publishQueueMessage failed", {
      channelId: queue.channelId,
      errorMessage,
      queueId,
    })

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueMessageSyncError,
      {
        queueId,
        error: errorMessage,
      }
    )

    throw new Error(errorMessage)
  }
}

async function updateQueueMessageForQueue(
  ctx: ActionCtx,
  queueId: Id<"viewerQueues">
) {
  const queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    { queueId }
  )

  if (!queue.messageId) {
    throw new Error("Queue message has not been published yet")
  }

  const entries = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueEntries,
    { queueId }
  )

  const payload: RESTPatchAPIChannelMessageJSONBody = renderQueueMessage({
    queue,
    queueSize: entries.length,
  }) as RESTPatchAPIChannelMessageJSONBody

  try {
    const response = await discordBotRequest(
      `/channels/${queue.channelId}/messages/${queue.messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(`Failed to update queue message: ${errorText}`)
    }

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.clearQueueMessageSyncError,
      {
        queueId,
      }
    )

    return {
      ok: true,
    }
  } catch (error) {
    const errorMessage = toErrorMessage(error, "Failed to update queue message.")

    console.error("Play With Viewers updateQueueMessage failed", {
      channelId: queue.channelId,
      errorMessage,
      messageId: queue.messageId,
      queueId,
    })

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueMessageSyncError,
      {
        queueId,
        error: errorMessage,
      }
    )

    throw new Error(errorMessage)
  }
}

function renderDirectMessagePayload(args: {
  creatorDisplayName: string
  gameLabel: string
  lobbyCode?: string
  title: string
}): RESTPostAPIChannelMessageJSONBody {
  const fields = [
    {
      inline: true,
      name: "Creator",
      value: args.creatorDisplayName,
    },
    {
      inline: true,
      name: "Game",
      value: args.gameLabel,
    },
  ]

  if (args.lobbyCode) {
    fields.push({
      inline: true,
      name: "Lobby code",
      value: `\`${args.lobbyCode}\``,
    })
  }

  fields.push({
    inline: false,
    name: "Next step",
    value: args.lobbyCode
      ? "Use the lobby code above to join up and play with the creator."
      : "Join up and play with the creator when they are ready for you.",
  })

  return {
    allowed_mentions: {
      parse: [],
    },
    embeds: [
      {
        color: 0x0f766e,
        description: "You have been selected for the next Play With Viewers lobby.",
        fields,
        title: `You're in for ${args.title}`,
      },
    ],
  }
}

async function sendDirectMessageToViewer(args: {
  discordUserId: string
  payload: RESTPostAPIChannelMessageJSONBody
}) {
  const channelResponse = await discordBotRequest("/users/@me/channels", {
    method: "POST",
    body: JSON.stringify({
      recipient_id: args.discordUserId,
    }),
  })

  if (!channelResponse.ok) {
    const errorText = await channelResponse.text()

    throw new Error(`Failed to open DM channel: ${errorText}`)
  }

  const directMessageChannel = (await channelResponse.json()) as { id: string }
  const messageResponse = await discordBotRequest(
    `/channels/${directMessageChannel.id}/messages`,
    {
      method: "POST",
      body: JSON.stringify(args.payload),
    }
  )

  if (!messageResponse.ok) {
    const errorText = await messageResponse.text()

    throw new Error(`Failed to send DM: ${errorText}`)
  }
}

async function notifySelectedUsersByDirectMessage(args: {
  ctx: ActionCtx
  lobbyCode?: string
  queueId: Id<"viewerQueues">
  roundId: Id<"viewerQueueRounds">
  selectedUsers: QueueRoundSelectedUser[]
}) {
  const queue = await args.ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId: args.queueId,
    }
  )

  if (queue.inviteMode !== "discord_dm") {
    return args.selectedUsers
  }

  const messagePayload = renderDirectMessagePayload({
    creatorDisplayName: queue.creatorDisplayName,
    gameLabel: queue.gameLabel,
    lobbyCode: args.lobbyCode,
    title: queue.title,
  })

  const notifiedUsers = await Promise.all(
    args.selectedUsers.map(async (user) => {
      try {
        await sendDirectMessageToViewer({
          discordUserId: user.discordUserId,
          payload: messagePayload,
        })

        return {
          ...user,
          dmFailureReason: undefined,
          dmStatus: "sent" as const,
        }
      } catch (error) {
        return {
          ...user,
          dmFailureReason: toErrorMessage(error, "Failed to send Discord DM."),
          dmStatus: "failed" as const,
        }
      }
    })
  )

  await args.ctx.runMutation(
    internal.mutations.creatorTools.playingWithViewers.queue.setQueueRoundSelectedUsers,
    {
      roundId: args.roundId,
      selectedUsers: notifiedUsers,
    }
  )

  return notifiedUsers
}

export const listAvailableDiscordGuilds = action({
  args: {},
  handler: async (ctx) => {
    const { clerkUserId } = await requireCreatorToolsActionAccess(ctx)

    return await listOwnedGuildsWithBot(clerkUserId)
  },
})

export const createQueueInOwnedGuild = action({
  args: {
    creatorDisplayName: v.string(),
    creatorMessage: v.optional(v.string()),
    gameLabel: v.string(),
    guildId: v.string(),
    inviteMode: inviteModeValidator,
    matchesPerViewer: v.number(),
    maxRank: rankValidator,
    minRank: rankValidator,
    playersPerBatch: v.number(),
    rulesText: v.optional(v.string()),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { clerkUserId, user } = await requireCreatorToolsActionAccess(ctx)
    const existingQueue = await ctx.runQuery(
      internal.queries.creatorTools.playingWithViewers.queue.getQueueByCreatorUserId,
      {
        creatorUserId: user._id,
      }
    )

    if (existingQueue) {
      throw new Error("A Play With Viewers queue is already configured for this account.")
    }

    const availableGuilds = await listOwnedGuildsWithBot(clerkUserId)
    const guildId = args.guildId.trim()
    const selectedGuild = availableGuilds.find((guild) => guild.id === guildId)

    if (!selectedGuild) {
      throw new Error(
        "Select a Discord server that you own and where the bot is already installed."
      )
    }

    const channel = await getOrCreateQueueChannel(guildId)
    const queueResult = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.createQueue,
      {
        channelId: channel.channelId,
        channelName: channel.channelName,
        creatorDisplayName: args.creatorDisplayName.trim(),
        creatorMessage: args.creatorMessage?.trim() || undefined,
        creatorUserId: user._id,
        gameLabel: args.gameLabel.trim(),
        guildId,
        guildName: selectedGuild.name,
        inviteMode: args.inviteMode,
        matchesPerViewer: args.matchesPerViewer,
        maxRank: args.maxRank,
        minRank: args.minRank,
        playersPerBatch: args.playersPerBatch,
        rulesText: args.rulesText?.trim() || undefined,
        title: args.title.trim(),
      }
    )

    let publishError: string | null = null

    try {
      await publishQueueMessageForQueue(ctx, queueResult.queueId)
    } catch (error) {
      publishError = toErrorMessage(
        error,
        "Queue created, but the initial Discord message could not be published."
      )
    }

    return {
      channelId: channel.channelId,
      channelName: channel.channelName,
      guildId,
      guildName: selectedGuild.name,
      messagePublished: publishError === null,
      publishError,
      queueId: queueResult.queueId,
      reusedChannel: channel.reusedChannel,
    }
  },
})

export const syncQueueDiscordContext = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const { queue } = await requireOwnedQueueActionAccess(ctx, args.queueId)

    const discordContext = await getDiscordQueueContext({
      channelId: queue.channelId,
      guildId: queue.guildId,
    })

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueDiscordContext,
      {
        channelName: discordContext.channelName,
        guildName: discordContext.guildName,
        queueId: args.queueId,
      }
    )

    return discordContext
  },
})

export const selectNextBatchAndNotify = action({
  args: {
    lobbyCode: v.optional(v.string()),
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.selectNextBatch,
      args
    )
    const selectedUsers = await notifySelectedUsersByDirectMessage({
      ctx,
      lobbyCode: args.lobbyCode?.trim() || undefined,
      queueId: args.queueId,
      roundId: result.roundId,
      selectedUsers: result.selectedUsers as QueueRoundSelectedUser[],
    })

    return {
      ...result,
      selectedCount: selectedUsers.length,
      selectedUsers,
    }
  },
})

export const inviteQueueEntryNowAndNotify = action({
  args: {
    entryId: v.id("viewerQueueEntries"),
    lobbyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueEntryActionAccess(ctx, args.entryId)

    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.inviteQueueEntryNow,
      args
    )
    const selectedUsers = await notifySelectedUsersByDirectMessage({
      ctx,
      lobbyCode: args.lobbyCode?.trim() || undefined,
      queueId: result.queueId,
      roundId: result.roundId,
      selectedUsers: result.selectedUsers as QueueRoundSelectedUser[],
    })

    return {
      ...result,
      selectedCount: selectedUsers.length,
      selectedUsers,
    }
  },
})

export const publishQueueMessage = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await publishQueueMessageForQueue(ctx, args.queueId)
  },
})

export const updateQueueMessage = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    await requireOwnedQueueActionAccess(ctx, args.queueId)

    return await updateQueueMessageForQueue(ctx, args.queueId)
  },
})

export const syncQueueMessageAfterViewerInteraction = internalAction({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    return await updateQueueMessageForQueue(ctx, args.queueId)
  },
})
