import { ConvexHttpClient } from "convex/browser"
import { api } from "@workspace/backend/convex/_generated/api"
import { env } from "@/lib/env"
import type { Doc, Id } from "@workspace/backend/convex/_generated/dataModel"
import type { FunctionArgs, FunctionReturnType } from "convex/server"
import { EnabledWorkerQueue } from "@workspace/backend/convex/queries/creatorTools/playingWithViewers/twitch"

export class ConvexService {
  private readonly client: ConvexHttpClient

  public constructor() {
    this.client = new ConvexHttpClient(env.TWITCH_CONVEX_URL)
  }

  public async getEnabledQueues(): Promise<EnabledWorkerQueue[]> {
    return this.client.query(
      api.queries.creatorTools.playingWithViewers.twitch
        .getEnabledQueuesForWorker,
      {
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }

  public async getQueueSnapshot(args: {
    queueId: Id<"viewerQueues">
    twitchUserId: string
  }): Promise<
    FunctionReturnType<
      typeof api.queries.creatorTools.playingWithViewers.twitch.getQueueSnapshotForWorker
    >
  > {
    return this.client.query(
      api.queries.creatorTools.playingWithViewers.twitch
        .getQueueSnapshotForWorker,
      {
        platform: "twitch",
        platformUserId: args.twitchUserId,
        queueId: args.queueId,
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }

  public async joinQueueFromTwitch(
    args: Omit<
      FunctionArgs<
        typeof api.actions.creatorTools.playingWithViewers.twitch.enqueueViewerFromWorker
      >,
      "workerSecret"
    >
  ) {
    return this.client.action(
      api.actions.creatorTools.playingWithViewers.twitch
        .enqueueViewerFromWorker,
      {
        ...args,
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }

  public async leaveQueueFromTwitch(args: {
    queueId: Id<"viewerQueues">
    twitchUserId: string
  }) {
    return this.client.action(
      api.actions.creatorTools.playingWithViewers.twitch.leaveViewerFromWorker,
      {
        ...args,
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }

  public async getPendingNotifications(
    limit = 25
  ): Promise<
    FunctionReturnType<
      typeof api.queries.creatorTools.playingWithViewers.twitch.getPendingNotificationsForWorker
    >
  > {
    return this.client.query(
      api.queries.creatorTools.playingWithViewers.twitch
        .getPendingNotificationsForWorker,
      {
        limit,
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }

  public async recordNotificationResult(
    args: Omit<
      FunctionArgs<
        typeof api.actions.creatorTools.playingWithViewers.twitch.recordNotificationResultFromWorker
      >,
      "workerSecret"
    >
  ) {
    return this.client.action(
      api.actions.creatorTools.playingWithViewers.twitch
        .recordNotificationResultFromWorker,
      {
        ...args,
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }

  public async deferNotification(
    args: Omit<
      FunctionArgs<
        typeof api.actions.creatorTools.playingWithViewers.twitch.deferNotificationFromWorker
      >,
      "workerSecret"
    >
  ) {
    return this.client.action(
      api.actions.creatorTools.playingWithViewers.twitch
        .deferNotificationFromWorker,
      {
        ...args,
        workerSecret: env.TWITCH_CONVEX_ADMIN_KEY,
      }
    )
  }
}
