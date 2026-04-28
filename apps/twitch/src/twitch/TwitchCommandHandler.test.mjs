import { describe, expect, it } from "bun:test";
import { TwitchCommandHandler } from "./TwitchCommandHandler.ts";

function createInput() {
  return {
    broadcasterId: "broadcaster-1",
    chatterDisplayName: "Twitch Viewer",
    chatterLogin: "viewer",
    chatterUserId: "twitch-user-1",
    messageText: "!queue",
    queueId: "viewerQueues:1",
    twitchCommandsEnabled: true,
  };
}

describe("TwitchCommandHandler", () => {
  it("reports queue position without listing upcoming players", async () => {
    const sentMessages = [];
    const handler = new TwitchCommandHandler(
      {
        getQueueSnapshot: async () => ({
          entries: [
            {
              displayName: "Discord Player",
              platform: "discord",
              rank: "unknown",
              username: "discord_name",
            },
            {
              displayName: "Twitch Player",
              platform: "twitch",
              rank: "unknown",
              username: "twitch_name",
            },
          ],
          isActive: true,
          queueId: "viewerQueues:1",
          size: 5,
          yourPosition: 4,
        }),
      },
      {
        sendChatMessage: async (_broadcasterId, message) => {
          sentMessages.push(message);
        },
      },
    );

    await handler.handleChatMessage(createInput());

    expect(sentMessages).toEqual([
      "Queue is open with 5 waiting. You're #4.",
    ]);
    expect(sentMessages[0]).not.toContain("Up next");
    expect(sentMessages[0]).not.toContain("discord_name");
    expect(sentMessages[0]).not.toContain("twitch_name");
  });

  it("sends Discord queue instructions when Twitch commands are disabled", async () => {
    const sentMessages = [];
    const handler = new TwitchCommandHandler(
      {
        getDiscordQueueInvite: async () => ({
          channelName: "play-with-viewers",
          discordChannelUrl:
            "https://discord.com/channels/guild-1/channel-1",
          discordInviteUrl: "https://discord.gg/invite-code",
          guildName: "Creator Server",
        }),
        getQueueSnapshot: async () => {
          throw new Error("queue snapshot should not be loaded");
        },
      },
      {
        sendChatMessage: async (_broadcasterId, message) => {
          sentMessages.push(message);
        },
      },
    );

    await handler.handleChatMessage({
      ...createInput(),
      messageText: "!join",
      twitchCommandsEnabled: false,
    });

    expect(sentMessages).toEqual([
      "@viewer Twitch queue commands are off. Join through Discord instead: https://discord.gg/invite-code then open #play-with-viewers and click Join Queue.",
    ]);
  });
});
