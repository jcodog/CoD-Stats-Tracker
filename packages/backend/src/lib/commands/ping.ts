import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10"
import type { ChatInputCommand } from "./types"

export const pingCommand: ChatInputCommand = {
  data: {
    name: "ping",
    description: "Check that the bot and interactions are working",
    type: ApplicationCommandType.ChatInput,
    integration_types: [
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ],
    contexts: [
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ],
  },
  handler: async () => {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "Pong.",
        flags: MessageFlags.Ephemeral,
      },
    }
  },
}
