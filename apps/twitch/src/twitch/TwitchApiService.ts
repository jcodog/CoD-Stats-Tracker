import { ApiClient } from "@twurple/api"
import { TwitchAuthService } from "@/twitch/TwitchAuthService"

export class TwitchApiService {
  private apiClient: ApiClient | null = null

  public constructor(private readonly authService: TwitchAuthService) {}

  public getApiClient(): ApiClient {
    if (this.apiClient) {
      return this.apiClient
    }

    this.apiClient = new ApiClient({
      authProvider: this.authService.getAuthProvider(),
    })

    return this.apiClient
  }
}
