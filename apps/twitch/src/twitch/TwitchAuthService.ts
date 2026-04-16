import { env } from "@/lib/env"
import { FileBackedTokenStore } from "@/lib/tokenStore"
import { RefreshingAuthProvider } from "@twurple/auth"

const DEFAULT_TWITCH_BOT_SCOPES = [
  "user:read:chat",
  "user:write:chat",
  "user:bot",
  "user:manage:whispers",
] as const

export class TwitchAuthService {
  private authProvider: RefreshingAuthProvider | null = null
  private readonly tokenStore = new FileBackedTokenStore(
    env.TWITCH_TOKEN_STORE_PATH
  )

  public async getAuthProvider(): Promise<RefreshingAuthProvider> {
    if (this.authProvider) {
      return this.authProvider
    }

    const authProvider = new RefreshingAuthProvider({
      clientId: env.TWITCH_CLIENT_ID,
      clientSecret: env.TWITCH_CLIENT_SECRET,
    })

    const storedToken = await this.tokenStore.read()
    const initialToken =
      storedToken ??
      (env.TWITCH_BOT_ACCESS_TOKEN && env.TWITCH_BOT_REFRESH_TOKEN
        ? {
            accessToken: env.TWITCH_BOT_ACCESS_TOKEN,
            expiresIn: 0,
            obtainmentTimestamp: Date.now(),
            refreshToken: env.TWITCH_BOT_REFRESH_TOKEN,
            scope: [...DEFAULT_TWITCH_BOT_SCOPES],
          }
        : null)

    if (!initialToken) {
      throw new Error("Missing Twitch bot access or refresh token.")
    }

    authProvider.addUser(env.TWITCH_BOT_USER_ID, initialToken)

    authProvider.onRefresh(async (_userId, tokenData) => {
      await this.tokenStore.write({
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expiresIn ?? 0,
        obtainmentTimestamp: tokenData.obtainmentTimestamp,
        refreshToken: tokenData.refreshToken ?? initialToken.refreshToken,
        scope: tokenData.scope ?? [...DEFAULT_TWITCH_BOT_SCOPES],
      })
    })

    authProvider.onRefreshFailure((userId, error) => {
      console.error("Failed to refresh Twitch token", { userId, error })
    })

    this.authProvider = authProvider
    return authProvider
  }

  public assertBotTokens(): void {
    if (!env.TWITCH_BOT_ACCESS_TOKEN || !env.TWITCH_BOT_REFRESH_TOKEN) {
      return
    }
  }
}
