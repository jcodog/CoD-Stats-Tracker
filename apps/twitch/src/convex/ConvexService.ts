import { ConvexHttpClient } from "convex/browser"
import { api } from "@workspace/backend/convex/_generated/api"
import { env } from "@/lib/env"

export class ConvexService {
  private readonly client: ConvexHttpClient

  public constructor() {
    this.client = new ConvexHttpClient(env.TWITCH_CONVEX_URL)
  }

  public async getEnabledCreators() {
    return this.client.query(api.twitch.getEnabledCreators, {})
  }

  public async joinQueueFromTwitch(args: {
    creatorId: string
    twitchUserId: string
    twitchLogin: string
    displayName: string
    joinedAt: number
  }) {
    return this.client.mutation(api.twitch.joinQueueFromTwitch, args)
  }
}
