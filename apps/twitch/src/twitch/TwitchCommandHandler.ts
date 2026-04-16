import { ConvexService } from "@/convex/ConvexService"
import { TwitchApiService } from "@/twitch/TwitchApiService"

type HandleChatMessageInput = {
  creatorId: string
  broadcasterId: string
  chatterUserId: string
  chatterLogin: string
  chatterDisplayName: string
  messageText: string
}

export class TwitchCommandHandler {
  private readonly cooldowns = new Map<string, number>()
  private static readonly COOLDOWN_MS = 10 * 60 * 1000

  public constructor(
    private readonly convexService: ConvexService,
    private readonly apiService: TwitchApiService
  ) {}

  public async handleChatMessage(input: HandleChatMessageInput): Promise<void> {
    const command = this.parseCommand(input.messageText)
    if (!command) return

    if (command === "join") {
      await this.handleJoin(input)
      return
    }

    if (command === "leave") {
      await this.handleLeave(input)
      return
    }

    if (command === "queue") {
      await this.handleQueue(input)
    }
  }

  private parseCommand(message: string): "join" | "leave" | "queue" | null {
    const normalized = message.trim().toLowerCase()
    if (normalized === "!join") return "join"
    if (normalized === "!leave") return "leave"
    if (normalized === "!queue") return "queue"
    return null
  }

  private isRateLimited(key: string): boolean {
    const now = Date.now()
    const lastUsed = this.cooldowns.get(key)
    if (!lastUsed) return false
    return now - lastUsed < TwitchCommandHandler.COOLDOWN_MS
  }

  private markUsed(key: string): void {
    this.cooldowns.set(key, Date.now())
  }

  private async handleJoin(input: HandleChatMessageInput): Promise<void> {
    const rateLimitKey = `${input.creatorId}:twitch:${input.chatterUserId}:join`

    if (this.isRateLimited(rateLimitKey)) {
      return
    }

    this.markUsed(rateLimitKey)

    await this.convexService.joinQueueFromTwitch({
      creatorId: input.creatorId,
      twitchUserId: input.chatterUserId,
      twitchLogin: input.chatterLogin,
      displayName: input.chatterDisplayName,
      joinedAt: Date.now(),
    })
  }

  private async handleLeave(_input: HandleChatMessageInput): Promise<void> {}

  private async handleQueue(_input: HandleChatMessageInput): Promise<void> {}
}
