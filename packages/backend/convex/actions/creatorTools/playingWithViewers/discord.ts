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

type DiscordGuildRole = {
  id: string
  name: string
  permissions: string
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
  parent_id?: string | null
  permission_overwrites?: DiscordChannelPermissionOverwrite[]
}

type DiscordGuildMember = {
  roles: string[]
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

type DiscordGuildPermissionContext = {
  guildPermissionBits: bigint
}

type QueueChannelBotPermissionStatus = {
  canUpdateChannelPermissions: boolean
  missingManageRoles: boolean
  missingPermissionLabels: string[]
  needsReinvite: boolean
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
] as const

const PLAY_WITH_VIEWERS_EVERYONE_DENY_PERMISSION_FLAGS = [
  PermissionFlagsBits.CreateInstantInvite,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalStickers,
  PermissionFlagsBits.SendPolls,
  PermissionFlagsBits.PinMessages,
  PermissionFlagsBits.UseExternalApps,
] as const

const PLAY_WITH_VIEWERS_REQUIRED_SERVER_PERMISSION_FLAGS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.UseApplicationCommands,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.CreateInstantInvite,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalStickers,
  PermissionFlagsBits.SendPolls,
  PermissionFlagsBits.PinMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.BypassSlowmode,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.UseEmbeddedActivities,
  PermissionFlagsBits.UseExternalApps,
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

const PLAY_WITH_VIEWERS_EVERYONE_DENY_PERMISSIONS = combinePermissionFlags(
  PLAY_WITH_VIEWERS_EVERYONE_DENY_PERMISSION_FLAGS
)

const PLAY_WITH_VIEWERS_BOT_DENY_PERMISSIONS = 0n

function parsePermissionBits(value: string | null | undefined) {
  return BigInt(value ?? "0")
}

const DISCORD_PERMISSION_LABELS = new Map<bigint, string>([
  [PermissionFlagsBits.ViewChannel, "View Channel"],
  [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
  [PermissionFlagsBits.UseApplicationCommands, "Use Application Commands"],
  [PermissionFlagsBits.CreateInstantInvite, "Create Invite"],
  [PermissionFlagsBits.SendMessages, "Send Messages"],
  [PermissionFlagsBits.SendTTSMessages, "Send TTS Messages"],
  [PermissionFlagsBits.EmbedLinks, "Embed Links"],
  [PermissionFlagsBits.AttachFiles, "Attach Files"],
  [PermissionFlagsBits.MentionEveryone, "Mention Everyone"],
  [PermissionFlagsBits.UseExternalEmojis, "Use External Emoji"],
  [PermissionFlagsBits.AddReactions, "Add Reactions"],
  [PermissionFlagsBits.CreatePublicThreads, "Create Public Threads"],
  [PermissionFlagsBits.CreatePrivateThreads, "Create Private Threads"],
  [PermissionFlagsBits.UseExternalStickers, "Use External Stickers"],
  [PermissionFlagsBits.SendMessagesInThreads, "Send Messages In Threads"],
  [PermissionFlagsBits.SendVoiceMessages, "Send Voice Messages"],
  [PermissionFlagsBits.SendPolls, "Create Polls"],
  [PermissionFlagsBits.PinMessages, "Pin Messages"],
  [PermissionFlagsBits.UseExternalApps, "Use External Apps"],
  [PermissionFlagsBits.ManageMessages, "Manage Messages"],
  [PermissionFlagsBits.BypassSlowmode, "Bypass Slow Mode"],
  [PermissionFlagsBits.ManageChannels, "Manage Channels"],
  [PermissionFlagsBits.ManageRoles, "Manage Roles"],
  [PermissionFlagsBits.KickMembers, "Kick Members"],
  [PermissionFlagsBits.ManageGuild, "Manage Server"],
  [PermissionFlagsBits.ManageWebhooks, "Manage Webhooks"],
  [PermissionFlagsBits.ModerateMembers, "Moderate Members"],
  [PermissionFlagsBits.UseEmbeddedActivities, "Use Embedded Activities"],
])

function hasPermission(permissionBits: bigint, permission: bigint) {
  return (
    (permissionBits & PermissionFlagsBits.Administrator) ===
      PermissionFlagsBits.Administrator ||
    (permissionBits & permission) === permission
  )
}

function getPermissionLabel(permission: bigint) {
  return (
    DISCORD_PERMISSION_LABELS.get(permission) ?? `Permission ${permission.toString()}`
  )
}

async function readDiscordApiErrorDetails(response: Response, fallback: string) {
  const responseText = await response.text()

  if (!responseText.trim()) {
    return {
      code: undefined,
      message: fallback,
    }
  }

  try {
    const payload = JSON.parse(responseText) as {
      code?: number
      message?: string
    }

    return {
      code: payload.code,
      message: payload.message?.trim() || responseText,
    }
  } catch {
    // Fall back to the raw text when Discord doesn't send JSON.
  }

  return {
    code: undefined,
    message: responseText,
  }
}

async function readDiscordApiError(response: Response, fallback: string) {
  const details = await readDiscordApiErrorDetails(response, fallback)

  return details.message
}

async function getBotGuildPermissionContext(
  guildId: string
): Promise<DiscordGuildPermissionContext> {
  const botUserId = getRequiredEnv("DISCORD_APPLICATION_ID")
  const [rolesResponse, memberResponse] = await Promise.all([
    discordBotRequest(`/guilds/${guildId}/roles`, {
      method: "GET",
    }),
    discordBotRequest(`/guilds/${guildId}/members/${botUserId}`, {
      method: "GET",
    }),
  ])

  if (!rolesResponse.ok) {
    const errorText = await readDiscordApiError(
      rolesResponse,
      "Failed to load Discord server roles."
    )

    throw new Error(`Failed to inspect Discord server roles: ${errorText}`)
  }

  if (!memberResponse.ok) {
    const errorText = await readDiscordApiError(
      memberResponse,
      "Failed to load the bot's Discord member record."
    )

    throw new Error(`Failed to inspect the bot's Discord membership: ${errorText}`)
  }

  const roles = (await rolesResponse.json()) as DiscordGuildRole[]
  const member = (await memberResponse.json()) as DiscordGuildMember
  const relevantRoleIds = new Set([guildId, ...member.roles])

  return {
    guildPermissionBits: roles.reduce((permissionBits, role) => {
      if (!relevantRoleIds.has(role.id)) {
        return permissionBits
      }

      return permissionBits | BigInt(role.permissions)
    }, 0n),
  }
}

async function getDiscordChannelDetails(channelId: string) {
  const channelResponse = await discordBotRequest(`/channels/${channelId}`, {
    method: "GET",
  })

  if (!channelResponse.ok) {
    const errorDetails = await readDiscordApiErrorDetails(
      channelResponse,
      "Failed to load Discord channel details."
    )

    if (channelResponse.status === 404 && errorDetails.code === 10003) {
      return null
    }

    throw new Error(`Failed to load Discord channel details: ${errorDetails.message}`)
  }

  return (await channelResponse.json()) as DiscordGuildChannelDetails
}

async function getDiscordGuildSummary(guildId: string) {
  const guildResponse = await discordBotRequest(`/guilds/${guildId}`, {
    method: "GET",
  })

  if (!guildResponse.ok) {
    const errorText = await guildResponse.text()

    throw new Error(`Failed to load Discord server details: ${errorText}`)
  }

  return (await guildResponse.json()) as DiscordGuildSummary
}

async function getBotQueueChannelPermissionStatus(
  args: {
    guildId: string
  }
): Promise<QueueChannelBotPermissionStatus> {
  const guildPermissionContext = await getBotGuildPermissionContext(args.guildId)
  const missingPermissionLabels = PLAY_WITH_VIEWERS_REQUIRED_SERVER_PERMISSION_FLAGS
    .filter((permission) => !hasPermission(guildPermissionContext.guildPermissionBits, permission))
    .map(getPermissionLabel)

  return {
    canUpdateChannelPermissions: missingPermissionLabels.length === 0,
    missingManageRoles: missingPermissionLabels.includes("Manage Roles"),
    missingPermissionLabels,
    needsReinvite: missingPermissionLabels.length > 0,
  }
}

function buildBotQueueChannelPermissionError(
  status: QueueChannelBotPermissionStatus
) {
  if (status.canUpdateChannelPermissions) {
    return null
  }

  if (status.missingManageRoles) {
    return `The CoD Stats bot does not currently have the Discord "Manage Roles" permission required in this server. Missing right now: ${status.missingPermissionLabels.join(
      ", "
    )}. Reinvite the bot with the updated server permissions, then try again.`
  }

  return `The CoD Stats bot is missing required Discord server permissions for Play With Viewers. Missing right now: ${status.missingPermissionLabels.join(
    ", "
  )}. Reinvite the bot with the updated server permissions, then try again.`
}

async function ensureBotCanConfigureQueueChannelPermissions(args: {
  guildId: string
}) {
  const status = await getBotQueueChannelPermissionStatus(args)
  const errorMessage = buildBotQueueChannelPermissionError(status)

  if (!errorMessage) {
    return
  }

  throw new Error(errorMessage)
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
  const actualOverwriteMap = new Map(
    [...(args.permissionOverwrites ?? [])].map((overwrite) => [
      `${overwrite.id}:${Number(overwrite.type)}`,
      {
        allow: parsePermissionBits(overwrite.allow),
        deny: parsePermissionBits(overwrite.deny),
      },
    ])
  )
  const [expectedEveryoneOverwrite, expectedBotOverwrite] =
    buildQueueChannelPermissionOverwrites(args.guildId)
  const actualEveryoneOverwrite = actualOverwriteMap.get(
    `${expectedEveryoneOverwrite.id}:${Number(expectedEveryoneOverwrite.type)}`
  )
  const actualBotOverwrite = actualOverwriteMap.get(
    `${expectedBotOverwrite.id}:${Number(expectedBotOverwrite.type)}`
  )

  if (!actualEveryoneOverwrite || !actualBotOverwrite) {
    return false
  }

  const expectedEveryoneAllow = parsePermissionBits(expectedEveryoneOverwrite.allow)
  const expectedEveryoneDeny = parsePermissionBits(expectedEveryoneOverwrite.deny)
  const expectedBotAllow = parsePermissionBits(expectedBotOverwrite.allow)
  const expectedBotDeny = parsePermissionBits(expectedBotOverwrite.deny)

  const everyoneAllowMatches =
    actualEveryoneOverwrite.allow === expectedEveryoneAllow
  const everyoneDenyCoversRequiredBits =
    (actualEveryoneOverwrite.deny & expectedEveryoneDeny) === expectedEveryoneDeny
  const everyoneDenyDoesNotBlockRequiredAllowBits =
    (actualEveryoneOverwrite.deny & expectedEveryoneAllow) === 0n
  const botAllowCoversRequiredBits =
    (actualBotOverwrite.allow & expectedBotAllow) === expectedBotAllow
  const botDenyDoesNotBlockRequiredBits =
    (actualBotOverwrite.deny & expectedBotAllow) === 0n &&
    (actualBotOverwrite.deny & expectedBotDeny) === expectedBotDeny

  return (
    everyoneAllowMatches &&
    everyoneDenyCoversRequiredBits &&
    everyoneDenyDoesNotBlockRequiredAllowBits &&
    botAllowCoversRequiredBits &&
    botDenyDoesNotBlockRequiredBits
  )
}

async function getQueueChannelPermissionState(args: {
  channelId: string
  guildId: string
}) {
  const channel = await getDiscordChannelDetails(args.channelId)

  if (!channel) {
    throw new Error(
      "The Play With Viewers channel no longer exists. Recreate it from the dashboard and try again."
    )
  }

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
  await ensureBotCanConfigureQueueChannelPermissions({
    guildId: args.guildId,
  })

  const overwrites = buildQueueChannelPermissionOverwrites(args.guildId)

  for (const overwrite of overwrites) {
    const response = await discordBotRequest(
      `/channels/${args.channelId}/permissions/${overwrite.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          allow: overwrite.allow,
          deny: overwrite.deny,
          type: overwrite.type,
        }),
      }
    )

    if (!response.ok) {
      const errorDetails = await readDiscordApiErrorDetails(
        response,
        "Discord rejected the channel permissions update."
      )

      if (response.status === 403 && errorDetails.message === "Missing Permissions") {
        throw new Error(
          "Discord is still blocking the Play With Viewers channel overwrite update. The bot has the required server permissions, so check whether this channel or its parent category is locked against overwrite edits."
        )
      }

      throw new Error(
        `Failed to update Play With Viewers channel permissions: ${errorDetails.message}`
      )
    }
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

async function ensureQueueDiscordChannel(
  ctx: ActionCtx,
  queue: Doc<"viewerQueues">
) {
  const existingChannel = await getDiscordChannelDetails(queue.channelId)

  if (existingChannel) {
    return {
      queue,
      recreatedChannel: false,
    }
  }

  const channel = await getOrCreateQueueChannel(queue.guildId)

  await ctx.runMutation(
    internal.mutations.creatorTools.playingWithViewers.queue.setQueueDiscordContext,
    {
      channelId: channel.channelId,
      channelName: channel.channelName,
      channelPermsCorrect: channel.channelPermsCorrect,
      queueId: queue._id,
      resetMessageState: true,
    }
  )

  const nextQueue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    {
      queueId: queue._id,
    }
  )

  return {
    queue: nextQueue,
    recreatedChannel: true,
  }
}

async function getReinviteRequiredQueueContext(args: {
  botPermissionStatus: QueueChannelBotPermissionStatus
  queue: Pick<Doc<"viewerQueues">, "channelName" | "guildId">
}) {
  const guild = await getDiscordGuildSummary(args.queue.guildId)

  return {
    botPermissionStatus: args.botPermissionStatus,
    channelName: args.queue.channelName?.trim() || PLAY_WITH_VIEWERS_CHANNEL_NAME,
    channelPermsCorrect: false,
    guildName: guild.name,
  }
}

async function getDiscordQueueContext(args: {
  botPermissionStatus?: QueueChannelBotPermissionStatus
  channelId: string
  guildId: string
}) {
  const [guild, channelState, botPermissionStatus] = await Promise.all([
    getDiscordGuildSummary(args.guildId),
    getQueueChannelPermissionState(args),
    args.botPermissionStatus
      ? Promise.resolve(args.botPermissionStatus)
      : getBotQueueChannelPermissionStatus({
          guildId: args.guildId,
        }),
  ])

  return {
    botPermissionStatus,
    channelName: channelState.channelName,
    channelPermsCorrect: channelState.channelPermsCorrect,
    guildName: guild.name,
  }
}

async function publishQueueMessageForQueue(
  ctx: ActionCtx,
  queueId: Id<"viewerQueues">,
  retriedAfterMissingChannel = false
) {
  let queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    { queueId }
  )

  try {
    await ensureBotCanConfigureQueueChannelPermissions({
      guildId: queue.guildId,
    })

    queue = (await ensureQueueDiscordChannel(ctx, queue)).queue

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

    const response = await discordBotRequest(`/channels/${queue.channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorDetails = await readDiscordApiErrorDetails(
        response,
        "Failed to publish queue message."
      )

      if (
        !retriedAfterMissingChannel &&
        response.status === 404 &&
        errorDetails.code === 10003
      ) {
        await ensureQueueDiscordChannel(ctx, queue)

        return await publishQueueMessageForQueue(ctx, queueId, true)
      }

      throw new Error(`Failed to publish queue message: ${errorDetails.message}`)
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
  let queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    { queueId }
  )

  try {
    await ensureBotCanConfigureQueueChannelPermissions({
      guildId: queue.guildId,
    })

    queue = (await ensureQueueDiscordChannel(ctx, queue)).queue

    if (!queue.messageId) {
      return await publishQueueMessageForQueue(ctx, queueId)
    }

    const entries = await ctx.runQuery(
      internal.queries.creatorTools.playingWithViewers.queue.getQueueEntries,
      { queueId }
    )

    const payload: RESTPatchAPIChannelMessageJSONBody = renderQueueMessage({
      queue,
      queueSize: entries.length,
    }) as RESTPatchAPIChannelMessageJSONBody

    const response = await discordBotRequest(
      `/channels/${queue.channelId}/messages/${queue.messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorDetails = await readDiscordApiErrorDetails(
        response,
        "Failed to update queue message."
      )

      if (response.status === 404 && errorDetails.code === 10003) {
        await ensureQueueDiscordChannel(ctx, queue)

        return await publishQueueMessageForQueue(ctx, queueId)
      }

      if (response.status === 404 && errorDetails.code === 10008) {
        await ctx.runMutation(
          internal.mutations.creatorTools.playingWithViewers.queue.clearQueueMessageMeta,
          {
            queueId,
          }
        )

        return await publishQueueMessageForQueue(ctx, queueId)
      }

      throw new Error(`Failed to update queue message: ${errorDetails.message}`)
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
    let { queue } = await requireOwnedQueueActionAccess(ctx, args.queueId)
    const botPermissionStatus = await getBotQueueChannelPermissionStatus({
      guildId: queue.guildId,
    })

    if (!botPermissionStatus.canUpdateChannelPermissions) {
      const discordContext = await getReinviteRequiredQueueContext({
        botPermissionStatus,
        queue,
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
    }

    queue = (await ensureQueueDiscordChannel(ctx, queue)).queue

    const discordContext = await getDiscordQueueContext({
      botPermissionStatus,
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
    const botPermissionStatus = await getBotQueueChannelPermissionStatus({
      guildId: queue.guildId,
    })

    if (!botPermissionStatus.canUpdateChannelPermissions) {
      const discordContext = await getReinviteRequiredQueueContext({
        botPermissionStatus,
        queue,
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

      return {
        ...discordContext,
        permissionsUpdated: false,
      }
    }

    const ensuredQueue = (await ensureQueueDiscordChannel(ctx, queue)).queue

    await applyQueueChannelPermissions({
      channelId: ensuredQueue.channelId,
      guildId: ensuredQueue.guildId,
    })

    const discordContext = await getDiscordQueueContext({
      botPermissionStatus,
      channelId: ensuredQueue.channelId,
      guildId: ensuredQueue.guildId,
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

    return {
      ...discordContext,
      permissionsUpdated: true,
    }
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
