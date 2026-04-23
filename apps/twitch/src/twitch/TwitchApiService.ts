import { ApiClient } from "@twurple/api"
import { env } from "@/lib/env"
import { TwitchAuthService } from "@/twitch/TwitchAuthService"

type TwitchEventSubSubscription = {
  id: string
  status: string
  type: string
  version: string
  condition?: {
    broadcaster_user_id?: string
    user_id?: string
  }
  transport?: {
    method?: string
    callback?: string
  }
}

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

  private async twitchFetch<T>(
    path: string,
    init: RequestInit,
    authMode: "app" | "bot-user" = "app"
  ): Promise<T> {
    const accessToken =
      authMode === "app"
        ? await this.authService.getAppAccessToken()
        : await this.authService.getBotUserAccessToken()

    const response = await fetch(`https://api.twitch.tv${path}`, {
      ...init,
      headers: {
        "Client-Id": env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Twitch API ${path} failed (${response.status}): ${body}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  public async sendChatMessage(
    broadcasterId: string,
    message: string
  ): Promise<void> {
    const response = await this.twitchFetch<{
      data?: Array<{
        message_id?: string
        is_sent?: boolean
        drop_reason?: {
          code?: string
          message?: string
        }
      }>
    }>(
      "/helix/chat/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          broadcaster_id: broadcasterId,
          sender_id: env.TWITCH_BOT_USER_ID,
          message,
        }),
      },
      "app"
    )

    const result = response.data?.[0]

    console.log("[twitch] sendChatMessage result", {
      broadcasterId,
      botUserId: env.TWITCH_BOT_USER_ID,
      messageId: result?.message_id ?? null,
      isSent: result?.is_sent ?? null,
      dropReasonCode: result?.drop_reason?.code ?? null,
      dropReasonMessage: result?.drop_reason?.message ?? null,
    })

    if (!result?.is_sent) {
      throw new Error(
        `Twitch dropped chat message: ${result?.drop_reason?.code ?? "unknown"} ${result?.drop_reason?.message ?? ""}`.trim()
      )
    }
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

  public async listChatMessageSubscriptions(): Promise<
    TwitchEventSubSubscription[]
  > {
    const response = await this.twitchFetch<{
      data?: TwitchEventSubSubscription[]
    }>(
      "/helix/eventsub/subscriptions?type=channel.chat.message",
      {
        method: "GET",
      },
      "app"
    )

    return response.data ?? []
  }

  public async createChatMessageSubscription(args: {
    broadcasterId: string
    callbackUrl: string
  }): Promise<string> {
    const response = await this.twitchFetch<{
      data?: Array<{ id?: string }>
    }>(
      "/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: args.broadcasterId,
            user_id: env.TWITCH_BOT_USER_ID,
          },
          transport: {
            method: "webhook",
            callback: args.callbackUrl,
            secret: env.TWITCH_EVENTSUB_SECRET,
          },
        }),
      },
      "app"
    )

    const id = response.data?.[0]?.id

    if (!id) {
      throw new Error("Twitch did not return an EventSub subscription id.")
    }

    return id
  }

  public async deleteEventSubSubscription(id: string): Promise<void> {
    await this.twitchFetch(
      `/helix/eventsub/subscriptions?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
      "app"
    )
  }
}
