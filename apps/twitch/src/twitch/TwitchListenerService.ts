import { EventSubWsListener } from "@twurple/eventsub-ws"
import { TwitchApiService } from "@/twitch/TwitchApiService"

export class TwitchListenerService {
  private listener: EventSubWsListener | null = null

  public constructor(private readonly apiService: TwitchApiService) {}

  public async getListener(): Promise<EventSubWsListener> {
    if (this.listener) {
      return this.listener
    }

    const listener = new EventSubWsListener({
      apiClient: await this.apiService.getApiClient(),
    })

    listener.onRevoke((subscription, status) => {
      console.error("Subscription revoked", {
        id: subscription.id,
        status,
      })
    })

    this.listener = listener
    return listener
  }

  public async start(): Promise<void> {
    const listener = await this.getListener()
    await listener.start()
  }

  public async stop(): Promise<void> {
    if (!this.listener) return
    await this.listener.stop()
  }
}
