"use node"

import { v } from "convex/values"
import { api } from "../../../_generated/api"
import { action } from "../../../_generated/server"
import {
  ButtonStyle,
  ComponentType,
  type RESTPatchAPIChannelMessageJSONBody,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10"

const DISCORD_API_BASE = "https://discord.com/api/v10"

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured")
  }

  return token
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
    descriptionLines.push("", `**Rules:** ${queue.rulesText.trim()}`)
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

async function discordRequest(
  path: string,
  init: RequestInit
): Promise<Response> {
  const token = getBotToken()

  return fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
}

export const publishQueueMessage = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.runQuery(
      api.queries.creatorTools.playingWithViewers.queue.getQueueById,
      { queueId: args.queueId }
    )

    const entries = await ctx.runQuery(
      api.queries.creatorTools.playingWithViewers.queue.getQueueEntries,
      { queueId: args.queueId }
    )

    const payload: RESTPostAPIChannelMessageJSONBody = renderQueueMessage({
      queue,
      queueSize: entries.length,
    }) as RESTPostAPIChannelMessageJSONBody

    const response = await discordRequest(
      `/channels/${queue.channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()

      await ctx.runMutation(
        api.mutations.creatorTools.playingWithViewers.queue
          .setQueueMessageSyncError,
        {
          queueId: args.queueId,
          error: `Failed to publish queue message: ${errorText}`,
        }
      )

      throw new Error(`Failed to publish queue message: ${errorText}`)
    }

    const createdMessage = (await response.json()) as { id: string }

    await ctx.runMutation(
      api.mutations.creatorTools.playingWithViewers.queue.setQueueMessageMeta,
      {
        queueId: args.queueId,
        messageId: createdMessage.id,
      }
    )

    return {
      ok: true,
      messageId: createdMessage.id,
    }
  },
})

export const updateQueueMessage = action({
  args: {
    queueId: v.id("viewerQueues"),
  },
  handler: async (ctx, args) => {
    const queue = await ctx.runQuery(
      api.queries.creatorTools.playingWithViewers.queue.getQueueById,
      { queueId: args.queueId }
    )

    if (!queue.messageId) {
      throw new Error("Queue message has not been published yet")
    }

    const entries = await ctx.runQuery(
      api.queries.creatorTools.playingWithViewers.queue.getQueueEntries,
      { queueId: args.queueId }
    )

    const payload: RESTPatchAPIChannelMessageJSONBody = renderQueueMessage({
      queue,
      queueSize: entries.length,
    }) as RESTPatchAPIChannelMessageJSONBody

    const response = await discordRequest(
      `/channels/${queue.channelId}/messages/${queue.messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()

      await ctx.runMutation(
        api.mutations.creatorTools.playingWithViewers.queue
          .setQueueMessageSyncError,
        {
          queueId: args.queueId,
          error: `Failed to update queue message: ${errorText}`,
        }
      )

      throw new Error(`Failed to update queue message: ${errorText}`)
    }

    await ctx.runMutation(
      api.mutations.creatorTools.playingWithViewers.queue
        .clearQueueMessageSyncError,
      {
        queueId: args.queueId,
      }
    )

    return {
      ok: true,
    }
  },
})
