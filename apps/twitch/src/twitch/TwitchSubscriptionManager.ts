import { ConvexService } from "@/convex/ConvexService"
import { env } from "@/lib/env"
import { TwitchApiService } from "@/twitch/TwitchApiService"
import { TwitchCommandHandler } from "@/twitch/TwitchCommandHandler"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "enabled",
  "webhook_callback_verification_pending",
])

export class TwitchSubscriptionManager {
  private readonly registeredBroadcasters = new Set<string>()

  public constructor(
    private readonly convexService: ConvexService,
    private readonly apiService: TwitchApiService,
    private readonly listenerService: TwitchListenerService,
    private readonly commandHandler: TwitchCommandHandler
  ) {}

  public async sync(): Promise<void> {
    const queues = await this.convexService.getEnabledQueues()
    const desiredBroadcasterIds = new Set(
      queues.map((queue) => queue.twitchBroadcasterId)
    )

    for (const queue of queues) {
      this.listenerService.registerChatHandler(
        queue.twitchBroadcasterId,
        async (event) => {
          await this.commandHandler.handleChatMessage({
            broadcasterId: queue.twitchBroadcasterId,
            chatterUserId: event.chatterUserId,
            chatterLogin: event.chatterLogin,
            chatterDisplayName: event.chatterDisplayName,
            messageText: event.messageText,
            queueId: queue.queueId,
          })
        }
      )

      this.registeredBroadcasters.add(queue.twitchBroadcasterId)
    }

    for (const broadcasterId of [...this.registeredBroadcasters]) {
      if (desiredBroadcasterIds.has(broadcasterId)) {
        continue
      }

      this.listenerService.unregisterChatHandler(broadcasterId)
      this.registeredBroadcasters.delete(broadcasterId)
    }

    const existing = await this.apiService.listChatMessageSubscriptions()
    const callbackUrl = this.listenerService.getCallbackUrl()

    const existingByBroadcaster = new Map<
      string,
      { id: string; status: string }[]
    >()

    for (const subscription of existing) {
      if (subscription.type !== "channel.chat.message") {
        continue
      }

      if (subscription.condition?.user_id !== env.TWITCH_BOT_USER_ID) {
        continue
      }

      if (subscription.transport?.method !== "webhook") {
        continue
      }

      if (subscription.transport?.callback !== callbackUrl) {
        continue
      }

      const broadcasterId = subscription.condition?.broadcaster_user_id
      if (!broadcasterId || !subscription.id) {
        continue
      }

      const list = existingByBroadcaster.get(broadcasterId) ?? []
      list.push({
        id: subscription.id,
        status: subscription.status,
      })
      existingByBroadcaster.set(broadcasterId, list)
    }

    for (const queue of queues) {
      const subscriptions =
        existingByBroadcaster.get(queue.twitchBroadcasterId) ?? []

      const hasActiveSubscription = subscriptions.some((subscription) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
      )

      if (!hasActiveSubscription) {
        await this.apiService.createChatMessageSubscription({
          broadcasterId: queue.twitchBroadcasterId,
          callbackUrl,
        })
      }
    }

    for (const [broadcasterId, subscriptions] of existingByBroadcaster) {
      if (desiredBroadcasterIds.has(broadcasterId)) {
        continue
      }

      for (const subscription of subscriptions) {
        await this.apiService.deleteEventSubSubscription(subscription.id)
      }
    }
  }
}
