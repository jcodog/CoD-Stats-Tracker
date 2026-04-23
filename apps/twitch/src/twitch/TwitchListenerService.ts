import { createHmac, timingSafeEqual } from "node:crypto"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { env } from "@/lib/env"

type ChatMessageHandler = (input: {
  broadcasterId: string
  chatterUserId: string
  chatterLogin: string
  chatterDisplayName: string
  messageText: string
}) => Promise<void>

type EventSubEnvelope = {
  subscription?: {
    type?: string
    status?: string
  }
  challenge?: string
  event?: {
    broadcaster_user_id?: string
    chatter_user_id?: string
    chatter_user_login?: string
    chatter_user_name?: string
    message?: {
      text?: string
    }
  }
}

export class TwitchListenerService {
  private server: ReturnType<typeof createServer> | null = null

  private readonly chatHandlers = new Map<string, ChatMessageHandler>()

  public getCallbackUrl(): string {
    const base = env.TWITCH_EVENTSUB_CALLBACK_BASE_URL.replace(/\/$/, "")
    const path = env.TWITCH_EVENTSUB_CALLBACK_PATH.startsWith("/")
      ? env.TWITCH_EVENTSUB_CALLBACK_PATH
      : `/${env.TWITCH_EVENTSUB_CALLBACK_PATH}`

    return `${base}${path}`
  }

  public registerChatHandler(
    broadcasterId: string,
    handler: ChatMessageHandler
  ): void {
    this.chatHandlers.set(broadcasterId, handler)
  }

  public unregisterChatHandler(broadcasterId: string): void {
    this.chatHandlers.delete(broadcasterId)
  }

  public async start(): Promise<void> {
    if (this.server) {
      return
    }

    this.server = createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res)
      } catch (error) {
        console.error("[twitch] EventSub request handling failed", error)
        res.statusCode = 500
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ error: "internal_error" }))
      }
    })

    await new Promise<void>((resolve) => {
      this.server!.listen(env.TWITCH_HTTP_PORT, resolve)
    })

    console.log("[twitch] EventSub webhook server listening", {
      port: env.TWITCH_HTTP_PORT,
      callbackUrl: this.getCallbackUrl(),
    })
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    const server = this.server
    this.server = null

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const method = req.method ?? "GET"
    const url = req.url ?? "/"

    if (method === "GET" && url === "/healthz") {
      res.statusCode = 200
      res.end("ok")
      return
    }

    if (method !== "POST" || url !== env.TWITCH_EVENTSUB_CALLBACK_PATH) {
      res.statusCode = 404
      res.end("not_found")
      return
    }

    const rawBody = await this.readBody(req)

    if (!this.isValidSignature(req, rawBody)) {
      res.statusCode = 403
      res.end("invalid_signature")
      return
    }

    const messageType = this.getHeader(req, "twitch-eventsub-message-type")

    const payload = JSON.parse(rawBody) as EventSubEnvelope

    if (messageType === "webhook_callback_verification") {
      res.statusCode = 200
      res.setHeader("Content-Type", "text/plain")
      res.end(payload.challenge ?? "")
      return
    }

    if (messageType === "revocation") {
      console.error("[twitch] EventSub subscription revoked", {
        type: payload.subscription?.type ?? null,
        status: payload.subscription?.status ?? null,
      })

      res.statusCode = 204
      res.end()
      return
    }

    if (
      messageType === "notification" &&
      payload.subscription?.type === "channel.chat.message"
    ) {
      const event = payload.event
      const broadcasterId = event?.broadcaster_user_id

      if (!broadcasterId) {
        res.statusCode = 400
        res.end("missing_broadcaster")
        return
      }

      const handler = this.chatHandlers.get(broadcasterId)

      if (!handler) {
        res.statusCode = 202
        res.end("no_handler")
        return
      }

      await handler({
        broadcasterId,
        chatterUserId: event?.chatter_user_id ?? "",
        chatterLogin: event?.chatter_user_login ?? "",
        chatterDisplayName: event?.chatter_user_name ?? "",
        messageText: event?.message?.text ?? "",
      })

      res.statusCode = 204
      res.end()
      return
    }

    res.statusCode = 204
    res.end()
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = []

    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    return Buffer.concat(chunks).toString("utf8")
  }

  private getHeader(req: IncomingMessage, name: string): string | null {
    const value = req.headers[name.toLowerCase()]

    if (Array.isArray(value)) {
      return value[0] ?? null
    }

    return typeof value === "string" ? value : null
  }

  private isValidSignature(req: IncomingMessage, rawBody: string): boolean {
    const messageId = this.getHeader(req, "twitch-eventsub-message-id")
    const timestamp = this.getHeader(req, "twitch-eventsub-message-timestamp")
    const signature = this.getHeader(req, "twitch-eventsub-message-signature")

    if (!messageId || !timestamp || !signature) {
      return false
    }

    const ageMs = Math.abs(Date.now() - Date.parse(timestamp))
    if (!Number.isFinite(ageMs) || ageMs > 10 * 60 * 1000) {
      return false
    }

    const expected = `sha256=${createHmac("sha256", env.TWITCH_EVENTSUB_SECRET)
      .update(messageId + timestamp + rawBody)
      .digest("hex")}`

    const expectedBuffer = Buffer.from(expected)
    const signatureBuffer = Buffer.from(signature)

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer)
  }
}
