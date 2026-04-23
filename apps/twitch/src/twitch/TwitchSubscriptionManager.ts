import { ConvexService } from "@/convex/ConvexService"
import { env } from "@/lib/env"
import { TwitchCommandHandler } from "@/twitch/TwitchCommandHandler"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"

type ActiveSubscription = {
  broadcasterId: string
  queueId: string
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
    const queues = await this.convexService.getEnabledQueues()
    const desiredIds = new Set(
      queues.map(
        (
          queue: Awaited<
            ReturnType<ConvexService["getEnabledQueues"]>
          >[number]
        ) => queue.twitchBroadcasterId
      )
    )

    for (const queue of queues) {
      if (this.activeSubscriptions.has(queue.twitchBroadcasterId)) {
        continue
      }

      const listener = await this.listenerService.getListener()

      const subscription = await listener.onChannelChatMessage(
        queue.twitchBroadcasterId,
        env.TWITCH_BOT_USER_ID,
        async (event) => {
          await this.commandHandler.handleChatMessage({
            broadcasterId: queue.twitchBroadcasterId,
            chatterUserId: event.chatterId,
            chatterLogin: event.chatterName,
            chatterDisplayName: event.chatterDisplayName,
            messageText: event.messageText,
            queueId: queue.queueId,
          })
        }
      )

      this.activeSubscriptions.set(queue.twitchBroadcasterId, {
        broadcasterId: queue.twitchBroadcasterId,
        queueId: queue.queueId,
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
