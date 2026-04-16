import { TwitchAuthService } from "@/twitch/TwitchAuthService"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"
import { TwitchNotificationService } from "@/twitch/TwitchNotificationService"
import { TwitchSubscriptionManager } from "@/twitch/TwitchSubscriptionManager"
import { env } from "@/lib/env"

export class TwitchWorker {
  private notificationInterval: ReturnType<typeof setInterval> | null = null
  private subscriptionInterval: ReturnType<typeof setInterval> | null = null

  public constructor(
    private readonly authService: TwitchAuthService,
    private readonly listenerService: TwitchListenerService,
    private readonly subscriptionManager: TwitchSubscriptionManager,
    private readonly notificationService: TwitchNotificationService
  ) {}

  public async start(): Promise<void> {
    this.authService.assertBotTokens()

    if (env.TWITCH_EVENTSUB_ENABLED) {
      await this.listenerService.start()
      await this.subscriptionManager.sync()
    }

    await this.notificationService.pollPendingNotifications()

    if (env.TWITCH_EVENTSUB_ENABLED) {
      this.subscriptionInterval = setInterval(() => {
        void this.subscriptionManager.sync()
      }, 60_000)
    }

    this.notificationInterval = setInterval(() => {
      void this.notificationService.pollPendingNotifications()
    }, 5_000)
  }

  public async stop(): Promise<void> {
    if (this.subscriptionInterval) {
      clearInterval(this.subscriptionInterval)
      this.subscriptionInterval = null
    }

    if (this.notificationInterval) {
      clearInterval(this.notificationInterval)
      this.notificationInterval = null
    }

    await this.listenerService.stop()
  }
}
