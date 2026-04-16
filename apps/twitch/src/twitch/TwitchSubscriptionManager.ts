import { ConvexService } from "@/convex/ConvexService"
import { TwitchCommandHandler } from "@/twitch/TwitchCommandHandler"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"

type ActiveSubscription = {
  broadcasterId: string
  stop: () => void | Promise<void>
}

export class TwitchSubscriptionManager {
  private readonly activeSubscriptions = new Map<string, ActiveSubscription>()

  public constructor(
    private readonly convexService: ConvexService,
    private readonly listenerService: TwitchListenerService,
    private readonly commandHandler: TwitchCommandHandler
  ) {}

  public async sync(): Promise<void> {
    const creators = await this.convexService.getEnabledCreators()
    const desiredIds = new Set(creators.map((creator) => creator.twitchUserId))

    for (const creator of creators) {
      if (this.activeSubscriptions.has(creator.twitchUserId)) {
        continue
      }

      const listener = this.listenerService.getListener()

      const subscription = await listener.onChannelChatMessage(
        creator.twitchUserId,
        process.env.TWITCH_BOT_USER_ID!,
        async (event) => {
          await this.commandHandler.handleChatMessage({
            creatorId: creator._id,
            broadcasterId: creator.twitchUserId,
            chatterUserId: event.chatterId,
            chatterLogin: event.chatterName,
            chatterDisplayName: event.chatterDisplayName,
            messageText: event.messageText,
          })
        }
      )

      this.activeSubscriptions.set(creator.twitchUserId, {
        broadcasterId: creator.twitchUserId,
        stop: () => subscription.stop(),
      })
    }

    for (const [broadcasterId, active] of this.activeSubscriptions) {
      if (desiredIds.has(broadcasterId)) continue
      await active.stop()
      this.activeSubscriptions.delete(broadcasterId)
    }
  }
}
