import { ConvexService } from "@/convex/ConvexService"
import { TwitchApiService } from "@/twitch/TwitchApiService"
import { TwitchAuthService } from "@/twitch/TwitchAuthService"
import { TwitchCommandHandler } from "@/twitch/TwitchCommandHandler"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"
import { TwitchNotificationService } from "@/twitch/TwitchNotificationService"
import { TwitchSubscriptionManager } from "@/twitch/TwitchSubscriptionManager"
import { TwitchWorker } from "@/twitch/TwitchWorker"

async function main() {
  const authService = new TwitchAuthService()
  const apiService = new TwitchApiService(authService)
  const convexService = new ConvexService()
  const commandHandler = new TwitchCommandHandler(convexService, apiService)
  const listenerService = new TwitchListenerService(apiService)
  const notificationService = new TwitchNotificationService(
    convexService,
    apiService
  )
  const subscriptionManager = new TwitchSubscriptionManager(
    convexService,
    listenerService,
    commandHandler
  )
  const worker = new TwitchWorker(
    authService,
    listenerService,
    subscriptionManager,
    notificationService
  )

  await worker.start()

  const shutdown = async () => {
    await worker.stop()
    process.exit(0)
  }

  process.on("SIGINT", () => {
    void shutdown()
  })
  process.on("SIGTERM", () => {
    void shutdown()
  })
}

main().catch((error) => {
  console.error("Failed to start Twitch worker", error)
  process.exit(1)
})
