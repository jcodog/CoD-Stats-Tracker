import { TwitchAuthService } from "@/twitch/TwitchAuthService"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"
import { TwitchSubscriptionManager } from "@/twitch/TwitchSubscriptionManager"

export class TwitchWorker {
  public constructor(
    private readonly authService: TwitchAuthService,
    private readonly listenerService: TwitchListenerService,
    private readonly subscriptionManager: TwitchSubscriptionManager
  ) {}

  public async start(): Promise<void> {
    this.authService.assertBotTokens()
    await this.listenerService.start()
    await this.subscriptionManager.sync()
  }

  public async stop(): Promise<void> {
    await this.listenerService.stop()
  }
}
