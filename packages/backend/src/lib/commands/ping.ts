import type {
  APIChatInputApplicationCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIInteractionCallbackJSONBody,
} from "discord-api-types/v10"
import {
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10"

export const pingCommand: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: "ping",
  description: "Check that the bot and interactions are working",
  type: ApplicationCommandType.ChatInput,
}

export async function handlePingCommand(
  _interaction: APIChatInputApplicationCommandInteraction
): Promise<RESTPostAPIInteractionCallbackJSONBody> {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: "Pong.",
      flags: MessageFlags.Ephemeral,
    },
  }
}
