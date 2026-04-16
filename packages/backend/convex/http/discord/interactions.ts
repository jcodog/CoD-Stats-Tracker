import type {
  APIChatInputApplicationCommandInteraction,
  APIInteraction,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  APIUser,
  RESTPostAPIInteractionCallbackJSONBody,
} from "discord-api-types/v10"
import type { Id } from "../../_generated/dataModel"
import {
  ApplicationCommandType,
  ComponentType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from "discord-api-types/v10"
import { pingCommand } from "../../lib/commands/ping"
import { internal } from "../../_generated/api"
import { httpAction, type ActionCtx } from "../../_generated/server"
import { getConvexEnv } from "../../env"

type ParsedCustomId =
  | { kind: "join"; queueId: string }
  | { kind: "leave"; queueId: string }
  | { kind: "status"; queueId: string }
  | { kind: "rank"; queueId: string }
  | null

type DiscordInteractionCtx = Pick<ActionCtx, "runAction" | "runMutation" | "runQuery">
type ViewerRank = (typeof DISCORD_RANK_OPTIONS)[number]["value"]

const DISCORD_RANK_OPTIONS = [
  { label: "Bronze", value: "bronze" },
  { label: "Silver", value: "silver" },
  { label: "Gold", value: "gold" },
  { label: "Platinum", value: "platinum" },
  { label: "Diamond", value: "diamond" },
  { label: "Crimson", value: "crimson" },
  { label: "Iridescent", value: "iridescent" },
  { label: "Top 250", value: "top250" },
] as const

const json = (
  body: RESTPostAPIInteractionCallbackJSONBody,
  init?: ResponseInit
): Response => {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
}

const jsonError = (message: string, status: number = 400): Response => {
  return json(
    {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: message,
        flags: MessageFlags.Ephemeral,
      },
    },
    { status }
  )
}

const normalizeInteractionErrorMessage = (message: string): string => {
  const normalized = message.replace(/^Uncaught Error:\s*/u, "").trim()

  switch (normalized) {
    case "Queue not found":
      return "This queue is no longer available."
    case "Queue is not active":
      return "This queue is currently closed."
    case "Viewer is already in the queue":
      return "You are already in this queue."
    case "Viewer is not in the queue":
      return "You are not currently in this queue."
    default:
      return normalized
  }
}

const getInteractionErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback
  }

  return normalizeInteractionErrorMessage(error.message)
}

const getDiscordUser = (interaction: APIInteraction): APIUser | null => {
  if ("member" in interaction && interaction.member?.user) {
    return interaction.member.user
  }

  if ("user" in interaction && interaction.user) {
    return interaction.user
  }

  return null
}

const getDiscordAvatarUrl = (interaction: APIInteraction): string | undefined => {
  const user = getDiscordUser(interaction)

  if (!user) {
    return undefined
  }

  if (
    "member" in interaction &&
    interaction.member?.avatar &&
    "guild_id" in interaction &&
    interaction.guild_id
  ) {
    return `https://cdn.discordapp.com/guilds/${interaction.guild_id}/users/${user.id}/avatars/${interaction.member.avatar}.png?size=128`
  }

  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
  }

  return undefined
}

const parseCustomId = (customId: string): ParsedCustomId => {
  const parts = customId.split(":")

  if (parts.length !== 4) {
    return null
  }

  const [prefix, version, action, queueId] = parts

  if (prefix !== "pwv" || version !== "v1" || !queueId) {
    return null
  }

  switch (action) {
    case "join":
      return { kind: "join", queueId }
    case "leave":
      return { kind: "leave", queueId }
    case "status":
      return { kind: "status", queueId }
    case "rank":
      return { kind: "rank", queueId }
    default:
      return null
  }
}

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

const hexToBytes = (hex: string): Uint8Array | null => {
  if (hex.length % 2 !== 0) {
    return null
  }

  const bytes = new Uint8Array(hex.length / 2)

  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16)

    if (Number.isNaN(byte)) {
      return null
    }

    bytes[i / 2] = byte
  }

  return bytes
}

async function verifyDiscordRequest(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const signature = request.headers.get("x-signature-ed25519")
  const timestamp = request.headers.get("x-signature-timestamp")
  const publicKey = getConvexEnv().DISCORD_APPLICATION_PUBLIC_KEY

  if (!signature || !timestamp || !publicKey) {
    return false
  }

  const signatureBytes = hexToBytes(signature)
  const publicKeyBytes = hexToBytes(publicKey)

  if (!signatureBytes || !publicKeyBytes) {
    return false
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(timestamp + rawBody)

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      bytesToArrayBuffer(publicKeyBytes),
      { name: "Ed25519" },
      false,
      ["verify"]
    )

    return await crypto.subtle.verify(
      { name: "Ed25519" },
      cryptoKey,
      bytesToArrayBuffer(signatureBytes),
      bytesToArrayBuffer(data)
    )
  } catch {
    return false
  }
}

function isMessageComponentInteraction(
  interaction: APIInteraction
): interaction is APIMessageComponentInteraction {
  return interaction.type === InteractionType.MessageComponent
}

function isModalSubmitInteraction(
  interaction: APIInteraction
): interaction is APIModalSubmitInteraction {
  return interaction.type === InteractionType.ModalSubmit
}

function buildRankSelectResponse(
  queueId: string
): RESTPostAPIInteractionCallbackJSONBody {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: "Choose your rank to join the queue.",
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              custom_id: `pwv:v1:rank:${queueId}`,
              placeholder: "Select your current rank",
              options: DISCORD_RANK_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              })),
              min_values: 1,
              max_values: 1,
            },
          ],
        },
      ],
    },
  }
}

function getSelectedRankFromComponentInteraction(
  interaction: APIMessageComponentInteraction
): ViewerRank | null {
  if (interaction.data.component_type !== ComponentType.StringSelect) {
    return null
  }

  const firstValue = interaction.data.values?.[0]?.trim()

  if (!firstValue) {
    return null
  }

  return DISCORD_RANK_OPTIONS.some((option) => option.value === firstValue)
    ? (firstValue as ViewerRank)
    : null
}

function buildStatusMessage(params: {
  creatorDisplayName: string
  gameLabel: string
  matchesPerViewer: number
  minRank: string
  maxRank: string
  isActive: boolean
  joined: boolean
  queuePosition: number | null
}): string {
  const lines = [
    `**Creator:** ${params.creatorDisplayName}`,
    `**Game:** ${params.gameLabel}`,
    `**Matches:** ${params.matchesPerViewer}`,
    `**Allowed ranks:** ${params.minRank} → ${params.maxRank}`,
    `**Queue status:** ${params.isActive ? "Open" : "Closed"}`,
  ]

  if (params.joined && params.queuePosition !== null) {
    lines.push(`**Your position:** ${params.queuePosition}`)
  } else {
    lines.push("You are not currently in this queue.")
  }

  return lines.join("\n")
}

async function handleJoinInteraction(
  ctx: DiscordInteractionCtx,
  interaction: APIMessageComponentInteraction,
  queueId: string
): Promise<Response> {
  const queueDocumentId = queueId as Id<"viewerQueues">
  const queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    { queueId: queueDocumentId }
  )

  if (!queue.isActive) {
    return json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "This queue is currently closed.",
        flags: MessageFlags.Ephemeral,
      },
    })
  }

  return json(buildRankSelectResponse(queueId))
}

async function handleLeaveInteraction(
  ctx: DiscordInteractionCtx,
  interaction: APIMessageComponentInteraction,
  queueId: string
): Promise<Response> {
  const queueDocumentId = queueId as Id<"viewerQueues">
  const user = getDiscordUser(interaction)

  if (!user) {
    return jsonError("Could not resolve your Discord user.")
  }

  try {
    await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.leaveQueueFromPlatform,
      {
        platform: "discord",
        platformUserId: user.id,
        queueId: queueDocumentId,
      }
    )
  } catch (error) {
    return json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: getInteractionErrorMessage(error, "Failed to leave the queue."),
        flags: MessageFlags.Ephemeral,
      },
    })
  }

  try {
    await ctx.runAction(
      internal.actions.creatorTools.playingWithViewers.discord.syncQueueMessageAfterViewerInteraction,
      {
        queueId: queueDocumentId,
      }
    )
  } catch (error) {
    console.error("Play With Viewers leave interaction sync failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      queueId,
      userId: user.id,
    })
  }

  return json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: "You have left the queue.",
      flags: MessageFlags.Ephemeral,
    },
  })
}

async function handleStatusInteraction(
  ctx: DiscordInteractionCtx,
  interaction: APIMessageComponentInteraction,
  queueId: string
): Promise<Response> {
  const queueDocumentId = queueId as Id<"viewerQueues">
  const user = getDiscordUser(interaction)

  if (!user) {
    return jsonError("Could not resolve your Discord user.")
  }

  const queue = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueById,
    { queueId: queueDocumentId }
  )

  const queueStatus = await ctx.runQuery(
    internal.queries.creatorTools.playingWithViewers.queue.getQueueStatusForIdentity,
    {
      platform: "discord",
      platformUserId: user.id,
      queueId: queueDocumentId,
    }
  )

  return json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: buildStatusMessage({
        creatorDisplayName: queue.creatorDisplayName,
        gameLabel: queue.gameLabel,
        matchesPerViewer: queue.matchesPerViewer,
        minRank: queue.minRank,
        maxRank: queue.maxRank,
        isActive: queue.isActive,
        joined: queueStatus.joined,
        queuePosition: queueStatus.queuePosition,
      }),
      flags: MessageFlags.Ephemeral,
    },
  })
}

async function handleRankSelectInteraction(
  ctx: DiscordInteractionCtx,
  interaction: APIMessageComponentInteraction,
  queueId: string
): Promise<Response> {
  const queueDocumentId = queueId as Id<"viewerQueues">
  const user = getDiscordUser(interaction)

  if (!user) {
    return jsonError("Could not resolve your Discord user.")
  }

  const selectedRank = getSelectedRankFromComponentInteraction(interaction)

  if (!selectedRank) {
    return jsonError("You must select a rank.")
  }

  try {
    const result = await ctx.runMutation(
      internal.mutations.creatorTools.playingWithViewers.queue.enqueueViewerFromPlatform,
      {
        avatarUrl: getDiscordAvatarUrl(interaction),
        displayName: user.global_name ?? user.username,
        platform: "discord",
        platformUserId: user.id,
        queueId: queueDocumentId,
        rank: selectedRank,
        username: user.username,
      }
    )

    if (result.status === "already_joined") {
      return json({
        type: InteractionResponseType.UpdateMessage,
        data: {
          content: "You are already in this queue.",
          flags: MessageFlags.Ephemeral,
          components: [],
        },
      })
    }

    if (result.status === "cooldown") {
      const cooldownMinutes = Math.ceil(result.cooldownRemainingMs / 60000)

      return json({
        type: InteractionResponseType.UpdateMessage,
        data: {
          content: `You can rejoin in about ${cooldownMinutes} minute${cooldownMinutes === 1 ? "" : "s"}.`,
          flags: MessageFlags.Ephemeral,
          components: [],
        },
      })
    }
  } catch (error) {
    return json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: getInteractionErrorMessage(error, "Failed to join the queue."),
        flags: MessageFlags.Ephemeral,
      },
    })
  }

  try {
    await ctx.runAction(
      internal.actions.creatorTools.playingWithViewers.discord.syncQueueMessageAfterViewerInteraction,
      {
        queueId: queueDocumentId,
      }
    )
  } catch (error) {
    console.error("Play With Viewers join interaction sync failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      queueId,
      userId: user.id,
    })
  }

  return json({
    type: InteractionResponseType.UpdateMessage,
    data: {
      content: "You joined the queue successfully.",
      flags: MessageFlags.Ephemeral,
      components: [],
    },
  })
}

async function handleMessageComponentInteraction(
  ctx: DiscordInteractionCtx,
  interaction: APIMessageComponentInteraction
): Promise<Response> {
  const parsed = parseCustomId(interaction.data.custom_id)

  if (!parsed) {
    return jsonError("Unknown interaction.")
  }

  switch (parsed.kind) {
    case "join":
      return handleJoinInteraction(ctx, interaction, parsed.queueId)
    case "leave":
      return handleLeaveInteraction(ctx, interaction, parsed.queueId)
    case "status":
      return handleStatusInteraction(ctx, interaction, parsed.queueId)
    case "rank":
      return handleRankSelectInteraction(ctx, interaction, parsed.queueId)
    default:
      return jsonError("Unsupported interaction.")
  }
}

function isChatInputCommandInteraction(
  interaction: APIInteraction
): interaction is APIChatInputApplicationCommandInteraction {
  return (
    interaction.type === InteractionType.ApplicationCommand &&
    interaction.data.type === ApplicationCommandType.ChatInput
  )
}

async function handleApplicationCommandInteraction(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<Response> {
  switch (interaction.data.name) {
    case pingCommand.data.name:
      return json(await pingCommand.handler(interaction))
    default:
      return json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Unknown command.",
          flags: MessageFlags.Ephemeral,
        },
      })
  }
}

export const handleDiscordInteractions = httpAction(async (ctx, request) => {
  const rawBody = await request.text()

  const isValid = await verifyDiscordRequest(request, rawBody)

  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 })
  }

  let interaction: APIInteraction

  try {
    interaction = JSON.parse(rawBody) as APIInteraction
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  if (interaction.type === InteractionType.Ping) {
    return json({
      type: InteractionResponseType.Pong,
    })
  }

  if (isMessageComponentInteraction(interaction)) {
    return handleMessageComponentInteraction(ctx, interaction)
  }

  if (isModalSubmitInteraction(interaction)) {
    return json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "Modal submit handling is not implemented yet.",
        flags: MessageFlags.Ephemeral,
      },
    })
  }

  if (isChatInputCommandInteraction(interaction)) {
    return handleApplicationCommandInteraction(interaction)
  }

  return json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: "Unsupported interaction type.",
      flags: MessageFlags.Ephemeral,
    },
  })
})
