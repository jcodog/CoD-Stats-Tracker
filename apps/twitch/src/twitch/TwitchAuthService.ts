import { env } from "@/lib/env"
import { RefreshingAuthProvider } from "@twurple/auth"

export class TwitchAuthService {
  private authProvider: RefreshingAuthProvider | null = null

  public getAuthProvider(): RefreshingAuthProvider {
    if (this.authProvider) {
      return this.authProvider
    }

    const authProvider = new RefreshingAuthProvider({
      clientId: env.TWITCH_CLIENT_ID,
      clientSecret: env.TWITCH_CLIENT_SECRET,
    })

    if (env.TWITCH_BOT_ACCESS_TOKEN && env.TWITCH_BOT_REFRESH_TOKEN) {
      authProvider.addUser(env.TWITCH_BOT_USER_ID, {
        accessToken: env.TWITCH_BOT_ACCESS_TOKEN,
        refreshToken: env.TWITCH_BOT_REFRESH_TOKEN,
        scope: ["user:read:chat", "user:write:chat", "user:bot"],
        obtainmentTimestamp: Date.now(),
        expiresIn: 0,
      })
    }

    authProvider.onRefresh((userId, tokenData) => {
      console.log("Refreshed Twitch token", { userId, tokenData })
    })

    authProvider.onRefreshFailure((userId, error) => {
      console.error("Failed to refresh Twitch token", { userId, error })
    })

    this.authProvider = authProvider
    return authProvider
  }

  public assertBotTokens(): void {
    if (!env.TWITCH_BOT_ACCESS_TOKEN || !env.TWITCH_BOT_REFRESH_TOKEN) {
      throw new Error("Missing Twitch bot access or refresh token.")
    }
  }
}
