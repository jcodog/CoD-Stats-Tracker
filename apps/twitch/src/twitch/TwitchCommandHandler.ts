import type { Id } from "@workspace/backend/convex/_generated/dataModel"
import {
  COMPETITIVE_RANK_VALUES,
  getParticipantRankLabel,
  parseCompetitiveRank,
  type CompetitiveRank,
} from "@workspace/backend/convex/lib/rankValidator"
import { ConvexService } from "@/convex/ConvexService"
import { TwitchApiService } from "@/twitch/TwitchApiService"

type HandleChatMessageInput = {
  broadcasterId: string
  chatterUserId: string
  chatterLogin: string
  chatterDisplayName: string
  messageText: string
  queueId: Id<"viewerQueues">
}

export class TwitchCommandHandler {
  public constructor(
    private readonly convexService: ConvexService,
    private readonly apiService: TwitchApiService
  ) {}

  public async handleChatMessage(input: HandleChatMessageInput): Promise<void> {
    const command = this.parseCommand(input.messageText)
    if (!command) return

    switch (command.kind) {
      case "join":
        await this.handleJoin(input, command.rankInput)
        return
      case "leave":
        await this.handleLeave(input)
        return
      case "queue":
        await this.handleQueue(input)
        return
    }
  }

  private parseCommand(
    message: string
  ):
    | { kind: "join"; rankInput: string | null }
    | { kind: "leave" }
    | { kind: "queue" }
    | null {
    const [command, rankInput] = message.trim().split(/\s+/, 2)
    const normalized = command?.toLowerCase()

    if (normalized === "!join") {
      return {
        kind: "join",
        rankInput: rankInput?.trim() || null,
      }
    }

    if (normalized === "!leave") {
      return { kind: "leave" }
    }

    if (normalized === "!queue") {
      return { kind: "queue" }
    }

    return null
  }

  private async reply(input: HandleChatMessageInput, message: string) {
    await this.apiService.sendChatMessage(input.broadcasterId, message)
  }

  private async handleJoin(
    input: HandleChatMessageInput,
    rankInput: string | null
  ): Promise<void> {
    let rank: CompetitiveRank | "unknown" = "unknown"

    if (rankInput) {
      const parsedRank = parseCompetitiveRank(rankInput)

      if (!parsedRank) {
        await this.reply(
          input,
          `@${input.chatterLogin} invalid rank. Use one of: ${COMPETITIVE_RANK_VALUES.join(", ")}.`
        )
        return
      }

      rank = parsedRank
    }

    try {
      const result = await this.convexService.joinQueueFromTwitch({
        avatarUrl: undefined,
        displayName: input.chatterDisplayName,
        queueId: input.queueId,
        rank,
        twitchLogin: input.chatterLogin,
        twitchUserId: input.chatterUserId,
      })

      if (result.status === "already_joined") {
        await this.reply(
          input,
          `@${input.chatterLogin} you're already in the queue.`
        )
        return
      }

      if (result.status === "cooldown") {
        const cooldownMinutes = Math.ceil(result.cooldownRemainingMs / 60000)
        await this.reply(
          input,
          `@${input.chatterLogin} you can rejoin in about ${cooldownMinutes} minute${cooldownMinutes === 1 ? "" : "s"}.`
        )
        return
      }

      await this.reply(
        input,
        `@${input.chatterLogin} joined the queue${rank === "unknown" ? " with rank unknown" : ` as ${getParticipantRankLabel(rank).toLowerCase()}`}.`
      )
    } catch (error) {
      await this.reply(
        input,
        `@${input.chatterLogin} ${this.toCommandErrorMessage(error, "I couldn't join you to the queue.")}`
      )
    }
  }

  private async handleLeave(input: HandleChatMessageInput): Promise<void> {
    try {
      await this.convexService.leaveQueueFromTwitch({
        queueId: input.queueId,
        twitchUserId: input.chatterUserId,
      })
      await this.reply(input, `@${input.chatterLogin} you left the queue.`)
    } catch (error) {
      await this.reply(
        input,
        `@${input.chatterLogin} ${this.toCommandErrorMessage(error, "I couldn't remove you from the queue.")}`
      )
    }
  }

  private async handleQueue(input: HandleChatMessageInput): Promise<void> {
    try {
      const snapshot = await this.convexService.getQueueSnapshot({
        queueId: input.queueId,
        twitchUserId: input.chatterUserId,
      })
      const preview = snapshot.entries
        .slice(0, 3)
        .map(
          (
            entry: Awaited<
              ReturnType<ConvexService["getQueueSnapshot"]>
            >["entries"][number]
          ) => `@${entry.username}`
        )
        .join(", ")
      const queueStatus = snapshot.isActive ? "open" : "closed"
      const positionText =
        snapshot.yourPosition === null
          ? "You're not currently in line."
          : `You're #${snapshot.yourPosition}.`

      await this.reply(
        input,
        `Queue is ${queueStatus} with ${snapshot.size} waiting. ${positionText}${preview ? ` Up next: ${preview}.` : ""}`
      )
    } catch (error) {
      await this.reply(
        input,
        `@${input.chatterLogin} ${this.toCommandErrorMessage(error, "I couldn't read the queue right now.")}`
      )
    }
  }

  private toCommandErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof Error) || !error.message.trim()) {
      return fallback
    }

    const normalized = error.message.replace(/^Uncaught Error:\s*/u, "").trim()

    switch (normalized) {
      case "Queue is not active":
        return "the queue is currently closed."
      case "Viewer is not in the queue":
        return "you're not currently in the queue."
      case "Queue not found":
        return "this queue is no longer available."
      default:
        return fallback
    }
  }
}
