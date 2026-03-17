import type {
  APIChatInputApplicationCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIInteractionCallbackJSONBody,
} from "discord-api-types/v10"

export type ChatInputCommand = {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody
  handler: (
    interaction: APIChatInputApplicationCommandInteraction
  ) => Promise<RESTPostAPIInteractionCallbackJSONBody>
}
