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
  OverwriteType,
  PermissionFlagsBits,
  type RESTPatchAPIChannelJSONBody,
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

type DiscordChannelPermissionOverwrite = {
  allow?: string | null
  deny?: string | null
  id: string
  type: number | OverwriteType
}

type DiscordGuildChannelDetails = DiscordGuildChannel & {
  permission_overwrites?: DiscordChannelPermissionOverwrite[]
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

const PLAY_WITH_VIEWERS_EVERYONE_PERMISSION_FLAGS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.UseApplicationCommands,
] as const

const PLAY_WITH_VIEWERS_BOT_EXTRA_PERMISSION_FLAGS = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.UseExternalStickers,
  PermissionFlagsBits.PinMessages,
  PermissionFlagsBits.BypassSlowmode,
  PermissionFlagsBits.SendPolls,
  PermissionFlagsBits.UseExternalApps,
  PermissionFlagsBits.UseEmbeddedActivities,
] as const

const PLAY_WITH_VIEWERS_TEXT_PERMISSION_FLAGS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.CreateInstantInvite,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendTTSMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.UseApplicationCommands,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.UseExternalStickers,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.SendVoiceMessages,
  PermissionFlagsBits.SendPolls,
  PermissionFlagsBits.PinMessages,
  PermissionFlagsBits.BypassSlowmode,
  PermissionFlagsBits.UseExternalApps,
  PermissionFlagsBits.UseEmbeddedActivities,
] as const

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

function getBotToken(): string {
  return getRequiredEnv("DISCORD_BOT_TOKEN")
}

function combinePermissionFlags(flags: readonly bigint[]) {
  return flags.reduce((combined, flag) => combined | flag, 0n)
}

const PLAY_WITH_VIEWERS_EVERYONE_ALLOW_PERMISSIONS = combinePermissionFlags(
  PLAY_WITH_VIEWERS_EVERYONE_PERMISSION_FLAGS
)

const PLAY_WITH_VIEWERS_BOT_ALLOW_PERMISSIONS = combinePermissionFlags([
  ...PLAY_WITH_VIEWERS_EVERYONE_PERMISSION_FLAGS,
  ...PLAY_WITH_VIEWERS_BOT_EXTRA_PERMISSION_FLAGS,
])

const PLAY_WITH_VIEWERS_PERMISSION_SPACE = combinePermissionFlags(
  PLAY_WITH_VIEWERS_TEXT_PERMISSION_FLAGS
)

const PLAY_WITH_VIEWERS_EVERYONE_DENY_PERMISSIONS =
  PLAY_WITH_VIEWERS_PERMISSION_SPACE &
  ~PLAY_WITH_VIEWERS_EVERYONE_ALLOW_PERMISSIONS

const PLAY_WITH_VIEWERS_BOT_DENY_PERMISSIONS =
  PLAY_WITH_VIEWERS_PERMISSION_SPACE & ~PLAY_WITH_VIEWERS_BOT_ALLOW_PERMISSIONS

function normalizePermissionBits(value: string | null | undefined) {
  return BigInt(value ?? "0").toString()
}

function buildQueueChannelPermissionOverwrites(guildId: string) {
  const botUserId = getRequiredEnv("DISCORD_APPLICATION_ID")

  return [
    {
      allow: PLAY_WITH_VIEWERS_EVERYONE_ALLOW_PERMISSIONS.toString(),
      deny: PLAY_WITH_VIEWERS_EVERYONE_DENY_PERMISSIONS.toString(),
      id: guildId,
      type: OverwriteType.Role,
    },
    {
      allow: PLAY_WITH_VIEWERS_BOT_ALLOW_PERMISSIONS.toString(),
      deny: PLAY_WITH_VIEWERS_BOT_DENY_PERMISSIONS.toString(),
      id: botUserId,
      type: OverwriteType.Member,
    },
  ] satisfies DiscordChannelPermissionOverwrite[]
}

function hasExpectedQueueChannelPermissions(args: {
  guildId: string
  permissionOverwrites: DiscordChannelPermissionOverwrite[] | null | undefined
}) {
  const actualOverwrites = [...(args.permissionOverwrites ?? [])]
    .map((overwrite) => ({
      allow: normalizePermissionBits(overwrite.allow),
      deny: normalizePermissionBits(overwrite.deny),
      id: overwrite.id,
      type: Number(overwrite.type),
    }))
    .sort((left, right) =>
      left.id === right.id ? left.type - right.type : left.id.localeCompare(right.id)
    )
  const expectedOverwrites = buildQueueChannelPermissionOverwrites(args.guildId)
    .map((overwrite) => ({
      allow: normalizePermissionBits(overwrite.allow),
      deny: normalizePermissionBits(overwrite.deny),
      id: overwrite.id,
      type: Number(overwrite.type),
    }))
    .sort((left, right) =>
      left.id === right.id ? left.type - right.type : left.id.localeCompare(right.id)
    )

  if (actualOverwrites.length !== expectedOverwrites.length) {
    return false
  }

  return actualOverwrites.every((overwrite, index) => {
    const expected = expectedOverwrites[index]

    return (
      overwrite.allow === expected.allow &&
      overwrite.deny === expected.deny &&
      overwrite.id === expected.id &&
      overwrite.type === expected.type
    )
  })
}

async function getQueueChannelPermissionState(args: {
  channelId: string
  guildId: string
}) {
  const channelResponse = await discordBotRequest(`/channels/${args.channelId}`, {
    method: "GET",
  })

  if (!channelResponse.ok) {
    const errorText = await channelResponse.text()

    throw new Error(`Failed to load Discord channel details: ${errorText}`)
  }

  const channel = (await channelResponse.json()) as DiscordGuildChannelDetails

  return {
    channelName: channel.name,
    channelPermsCorrect: hasExpectedQueueChannelPermissions({
      guildId: args.guildId,
      permissionOverwrites: channel.permission_overwrites,
    }),
  }
}

async function applyQueueChannelPermissions(args: {
  channelId: string
  guildId: string
}) {
  const response = await discordBotRequest(`/channels/${args.channelId}`, {
    method: "PATCH",
    body: JSON.stringify({
      permission_overwrites: buildQueueChannelPermissionOverwrites(args.guildId),
    } satisfies RESTPatchAPIChannelJSONBody),
  })

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Failed to update Play With Viewers channel permissions: ${errorText}`)
  }

  const permissionState = await getQueueChannelPermissionState(args)

  if (!permissionState.channelPermsCorrect) {
    throw new Error(
      "The Play With Viewers channel permissions could not be verified after updating them."
    )
  }

  return permissionState
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
            disabled: !queue.isActive,
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "My Status",
            custom_id: buildCustomId("status", queue._id),
            disabled: !queue.isActive,
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

  const reusedChannel = Boolean(existingChannel)
  let channelId = existingChannel?.id ?? null

  if (!channelId) {
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
    channelId = createdChannel.id
  }

  const permissionState = await applyQueueChannelPermissions({
    channelId,
    guildId,
  })

  return {
    channelId,
    channelName: permissionState.channelName,
    channelPermsCorrect: permissionState.channelPermsCorrect,
    reusedChannel,
  }
}

async function getDiscordQueueContext(args: {
  channelId: string
  guildId: string
}) {
  const [guildResponse, channelState] = await Promise.all([
    discordBotRequest(`/guilds/${args.guildId}`, {
      method: "GET",
    }),
    getQueueChannelPermissionState(args),
  ])

  if (!guildResponse.ok) {
    const errorText = await guildResponse.text()

    throw new Error(`Failed to load Discord server details: ${errorText}`)
  }

  const guild = (await guildResponse.json()) as DiscordGuildSummary

  return {
    channelName: channelState.channelName,
    channelPermsCorrect: channelState.channelPermsCorrect,
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

  if (queue.messageId) {
    throw new Error(
      "Queue message is already published. Use refresh to update the existing message."
    )
  }

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
    const latestQueue = await ctx.runQuery(
      internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
      { queueId }
    )

    if (latestQueue.messageId && latestQueue.messageId !== createdMessage.id) {
      const deleteResponse = await discordBotRequest(
        `/channels/${queue.channelId}/messages/${createdMessage.id}`,
        {
          method: "DELETE",
        }
      )

      if (!deleteResponse.ok) {
        console.error("Play With Viewers duplicate publish cleanup failed", {
          createdMessageId: createdMessage.id,
          queueId,
          status: deleteResponse.status,
        })
      }

      throw new Error(
        "Queue message is already published. Use refresh to update the existing message."
      )
    }

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

    throw new Error(errorMessage, {
      cause: error,
    })
  }
}

function getCreatorFacingDirectMessageFailureMessage() {
  return "Couldn't DM this viewer. Ask them to enable DMs or contact them manually."
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

    throw new Error(errorMessage, {
      cause: error,
    })
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
        console.error("Play With Viewers DM send failed", {
          discordUserId: user.discordUserId,
          errorMessage: toErrorMessage(error, "Failed to send Discord DM."),
          queueId: args.queueId,
          roundId: args.roundId,
        })

        return {
          ...user,
          dmFailureReason: getCreatorFacingDirectMessageFailureMessage(),
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
        channelPermsCorrect: channel.channelPermsCorrect,
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
        channelPermsCorrect: discordContext.channelPermsCorrect,
        guildName: discordContext.guildName,
        queueId: args.queueId,
      }
    )

    return discordContext
  },
})

export const fixQueueChannelPermissions = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const { queue } = await requireOwnedQueueActionAccess(ctx, args.queueId)

    await applyQueueChannelPermissions({
      channelId: queue.channelId,
      guildId: queue.guildId,
    })

    const discordContext = await getDiscordQueueContext({
      channelId: queue.channelId,
      guildId: queue.guildId,
    })

    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.setQueueDiscordContext,
      {
        channelName: discordContext.channelName,
        channelPermsCorrect: discordContext.channelPermsCorrect,
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
