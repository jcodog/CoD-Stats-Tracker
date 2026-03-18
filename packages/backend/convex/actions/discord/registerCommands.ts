"use node"

import { v } from "convex/values"
import { action } from "../../_generated/server"
import type { RESTPutAPIApplicationCommandsJSONBody } from "discord-api-types/v10"

import { pingCommand } from "../../lib/commands/ping"

const DISCORD_API_BASE = "https://discord.com/api/v10"

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

const discordCommands: RESTPutAPIApplicationCommandsJSONBody = [
  pingCommand.data,
]

export const registerDiscordCommands = action({
  args: {
    scope: v.union(v.literal("guild"), v.literal("global")),
    guildId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const applicationId = getRequiredEnv("DISCORD_APPLICATION_ID")
    const botToken = getRequiredEnv("DISCORD_BOT_TOKEN")

    const guildId =
      args.scope === "guild"
        ? args.guildId?.trim() || process.env.DISCORD_DEV_GUILD_ID?.trim()
        : undefined

    if (args.scope === "guild" && !guildId) {
      throw new Error("guildId is required for guild command registration")
    }

    const path =
      args.scope === "guild"
        ? `/applications/${applicationId}/guilds/${guildId}/commands`
        : `/applications/${applicationId}/commands`

    const response = await fetch(`${DISCORD_API_BASE}${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordCommands),
    })

    const text = await response.text()

    if (!response.ok) {
      throw new Error(
        `Discord command registration failed: ${response.status} ${text}`
      )
    }

    return {
      ok: true,
      scope: args.scope,
      guildId: guildId ?? null,
      registeredCount: discordCommands.length,
    }
  },
})
