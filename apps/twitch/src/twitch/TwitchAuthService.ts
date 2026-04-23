import { RefreshingAuthProvider } from "@twurple/auth"
import { env } from "@/lib/env"
import { FileBackedTokenStore } from "@/lib/tokenStore"

const DEFAULT_TWITCH_BOT_SCOPES = [
  "user:read:chat",
  "user:write:chat",
  "user:bot",
  "user:manage:whispers",
] as const

type AppAccessTokenCache = {
  accessToken: string
  expiresAt: number
}

export class TwitchAuthService {
  private authProvider: RefreshingAuthProvider | null = null
  private appAccessTokenCache: AppAccessTokenCache | null = null

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
      throw new Error(
        "Missing Twitch bot token. Provide TWITCH_BOT_ACCESS_TOKEN and TWITCH_BOT_REFRESH_TOKEN or seed the token store."
      )
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
      console.error("Failed to refresh Twitch bot token", { userId, error })
    })

    this.authProvider = authProvider
    return authProvider
  }

  public async getBotUserAccessToken(): Promise<string> {
    const authProvider = await this.getAuthProvider()
    const accessToken = await authProvider.getAccessTokenForUser(
      env.TWITCH_BOT_USER_ID
    )

    if (!accessToken?.accessToken) {
      throw new Error(
        `No refreshed bot user access token available for ${env.TWITCH_BOT_USER_ID}`
      )
    }

    return accessToken.accessToken
  }

  public async getAppAccessToken(): Promise<string> {
    const now = Date.now()

    if (
      this.appAccessTokenCache &&
      this.appAccessTokenCache.expiresAt > now + 60_000
    ) {
      return this.appAccessTokenCache.accessToken
    }

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Failed to obtain Twitch app access token (${response.status}): ${body}`
      )
    }

    const data = (await response.json()) as {
      access_token?: string
      expires_in?: number
    }

    if (!data.access_token || typeof data.expires_in !== "number") {
      throw new Error("Twitch app token response was missing expected fields.")
    }

    this.appAccessTokenCache = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    }

    return data.access_token
  }

  public async warmup(): Promise<void> {
    await this.getAuthProvider()
    await this.getAppAccessToken()
  }
}
