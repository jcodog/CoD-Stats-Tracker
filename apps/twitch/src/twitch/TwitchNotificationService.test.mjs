import { describe, expect, it } from "bun:test";
import { TwitchNotificationService } from "./TwitchNotificationService.ts";

describe("TwitchNotificationService", () => {
  it("does not leak invite codes in public chat fallback", async () => {
    const chatMessages = [];
    const notificationResults = [];
    const service = new TwitchNotificationService(
      {
        getPendingNotifications: async () => [
          {
            attemptCount: 0,
            creatorDisplayName: "Creator",
            displayName: "Viewer",
            gameLabel: "Call of Duty",
            inviteCode: "SECRET-123",
            inviteCodeType: "party_code",
            nextAttemptAt: Date.now(),
            notificationId: "viewerQueueNotifications:1",
            platformUserId: "twitch-user-1",
            title: "Play With Viewers",
            twitchBroadcasterId: "broadcaster-1",
            twitchBroadcasterLogin: "creator",
            username: "viewer",
          },
        ],
        recordNotificationResult: async (args) => {
          notificationResults.push(args);
        },
      },
      {
        sendChatMessage: async (_broadcasterId, message) => {
          chatMessages.push(message);
        },
        sendWhisper: async () => {
          throw new Error("whisper failed");
        },
      },
    );

    await service.pollPendingNotifications();

    expect(chatMessages).toHaveLength(1);
    expect(chatMessages[0]).toContain("@viewer Creator selected you");
    expect(chatMessages[0]).not.toContain("SECRET-123");
    expect(notificationResults).toMatchObject([
      {
        notificationMethod: "twitch_chat_fallback",
        notificationStatus: "sent",
      },
    ]);
  });
});
