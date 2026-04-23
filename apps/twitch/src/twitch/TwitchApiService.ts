import { ApiClient } from "@twurple/api"
import { env } from "@/lib/env"
import { TwitchAuthService } from "@/twitch/TwitchAuthService"

export class TwitchApiService {
  private apiClient: ApiClient | null = null

  public constructor(private readonly authService: TwitchAuthService) {}

  public async getApiClient(): Promise<ApiClient> {
    if (this.apiClient) {
      return this.apiClient
    }

    this.apiClient = new ApiClient({
      authProvider: await this.authService.getAuthProvider(),
    })

    return this.apiClient
  }

  public async sendChatMessage(
    broadcasterId: string,
    message: string
  ): Promise<void> {
    const apiClient = await this.getApiClient()

    await apiClient.asUser(env.TWITCH_BOT_USER_ID, async (ctx) => {
      const result = await ctx.chat.sendChatMessage(broadcasterId, message)

      console.log("[twitch] sendChatMessage result", {
        broadcasterId,
        botUserId: env.TWITCH_BOT_USER_ID,
        isSent: result.isSent,
        dropReasonCode: result.dropReasonCode ?? null,
        dropReasonMessage: result.dropReasonMessage ?? null,
        messageId: result.id,
      })

      if (!result.isSent) {
        throw new Error(
          `Twitch dropped chat message: ${result.dropReasonCode ?? "unknown"} ${result.dropReasonMessage ?? ""}`.trim()
        )
      }
    })
  }

  public async sendWhisper(
    recipientId: string,
    message: string
  ): Promise<void> {
    const apiClient = await this.getApiClient()

    await apiClient.asUser(env.TWITCH_BOT_USER_ID, async (ctx) => {
      await ctx.whispers.sendWhisper(
        env.TWITCH_BOT_USER_ID,
        recipientId,
        message
      )
    })
  }
}
