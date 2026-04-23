import { buildInviteMessagePreview } from "@workspace/backend/convex/lib/playingWithViewers"
import { ConvexService } from "@/convex/ConvexService"
import { TwitchApiService } from "@/twitch/TwitchApiService"

const RATE_LIMIT_RETRY_MS = 60_000

function isRateLimitError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return message.includes("rate limit") || message.includes("429")
}

export class TwitchNotificationService {
  private readonly inFlightNotificationIds = new Set<string>()
  private isPolling = false

  public constructor(
    private readonly convexService: ConvexService,
    private readonly apiService: TwitchApiService
  ) {}

  public async pollPendingNotifications(): Promise<void> {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    try {
      const notifications = await this.convexService.getPendingNotifications()

      for (const notification of notifications) {
        if (this.inFlightNotificationIds.has(notification.notificationId)) {
          continue
        }

        this.inFlightNotificationIds.add(notification.notificationId)

        try {
          await this.processNotification(notification)
        } finally {
          this.inFlightNotificationIds.delete(notification.notificationId)
        }
      }
    } finally {
      this.isPolling = false
    }
  }

  private async processNotification(notification: Awaited<
    ReturnType<ConvexService["getPendingNotifications"]>
  >[number]) {
    if (!notification.inviteCode || !notification.inviteCodeType) {
      await this.convexService.recordNotificationResult({
        notificationFailureReason: "Missing invite details for Twitch delivery.",
        notificationId: notification.notificationId,
        notificationMethod: "twitch_whisper",
        notificationStatus: "failed",
      })
      return
    }

    const inviteMessage = buildInviteMessagePreview({
      creatorDisplayName: notification.creatorDisplayName,
      gameLabel: notification.gameLabel,
      inviteCode: notification.inviteCode,
      inviteCodeType: notification.inviteCodeType,
      title: notification.title,
    })

    try {
      await this.apiService.sendWhisper(notification.platformUserId, inviteMessage)
      await this.convexService.recordNotificationResult({
        notificationId: notification.notificationId,
        notificationMethod: "twitch_whisper",
        notificationStatus: "sent",
      })
      return
    } catch (error) {
      if (isRateLimitError(error)) {
        await this.convexService.deferNotification({
          nextAttemptAt: Date.now() + RATE_LIMIT_RETRY_MS,
          notificationFailureReason: "Twitch whisper rate limited. Retrying soon.",
          notificationId: notification.notificationId,
        })
        return
      }
    }

    try {
      await this.apiService.sendChatMessage(
        notification.twitchBroadcasterId,
        `@${notification.username} ${notification.creatorDisplayName} selected you. Check stream chat with the creator for your invite code: ${notification.inviteCode}.`
      )
      await this.convexService.recordNotificationResult({
        notificationId: notification.notificationId,
        notificationMethod: "twitch_chat_fallback",
        notificationStatus: "sent",
      })
    } catch (error) {
      if (isRateLimitError(error)) {
        await this.convexService.deferNotification({
          nextAttemptAt: Date.now() + RATE_LIMIT_RETRY_MS,
          notificationFailureReason: "Twitch chat fallback rate limited. Retrying soon.",
          notificationId: notification.notificationId,
        })
        return
      }

      await this.convexService.recordNotificationResult({
        notificationFailureReason:
          "Twitch whisper failed and chat fallback could not be delivered.",
        notificationId: notification.notificationId,
        notificationMethod: "twitch_chat_fallback",
        notificationStatus: "failed",
      })
    }
  }
}
