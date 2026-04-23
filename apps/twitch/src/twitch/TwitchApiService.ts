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

    await apiClient.chat.sendChatMessage(broadcasterId, message)
  }

  public async sendWhisper(
    recipientId: string,
    message: string
  ): Promise<void> {
    const apiClient = await this.getApiClient()

    await apiClient.whispers.sendWhisper(
      env.TWITCH_BOT_USER_ID,
      recipientId,
      message
    )
  }
}
