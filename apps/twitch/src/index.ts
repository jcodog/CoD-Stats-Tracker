import { ConvexService } from "@/convex/ConvexService"
import { TwitchApiService } from "@/twitch/TwitchApiService"
import { TwitchAuthService } from "@/twitch/TwitchAuthService"
import { TwitchCommandHandler } from "@/twitch/TwitchCommandHandler"
import { TwitchListenerService } from "@/twitch/TwitchListenerService"
import { TwitchSubscriptionManager } from "@/twitch/TwitchSubscriptionManager"
import { TwitchWorker } from "@/twitch/TwitchWorker"

async function main() {
  const authService = new TwitchAuthService()
  const apiService = new TwitchApiService(authService)
  const convexService = new ConvexService()
  const commandHandler = new TwitchCommandHandler(convexService, apiService)
  const listenerService = new TwitchListenerService(apiService)
  const subscriptionManager = new TwitchSubscriptionManager(
    convexService,
    listenerService,
    commandHandler
  )
  const worker = new TwitchWorker(
    authService,
    listenerService,
    subscriptionManager
  )

  await worker.start()
}

main().catch((error) => {
  console.error("Failed to start Twitch worker", error)
  process.exit(1)
})
