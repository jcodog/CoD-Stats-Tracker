import { auth } from "@clerk/nextjs/server"
import { fetchAction } from "convex/nextjs"
import type { FunctionArgs } from "convex/server"
import { NextResponse } from "next/server"

import { api } from "@workspace/backend/convex/_generated/api"

import {
  PLAY_WITH_VIEWERS_CSRF_HEADER,
  PLAY_WITH_VIEWERS_CSRF_HEADER_VALUE,
  playWithViewersApiActions,
  type PlayWithViewersApiAction,
} from "@/features/creator-tools/play-with-viewers/lib/play-with-viewers-api"
import { validateSameOriginJsonMutationRequest } from "@/lib/server/csrf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PlayWithViewersMutationRequest = {
  action: PlayWithViewersApiAction
  input?: unknown
}

function toErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : ""

  if (!message) {
    return fallback
  }

  return message.replace(/^Uncaught Error:\s*/u, "")
}

function isPlayWithViewersAction(
  value: unknown
): value is PlayWithViewersApiAction {
  return (
    typeof value === "string" &&
    (playWithViewersApiActions as readonly string[]).includes(value)
  )
}

async function runPlayWithViewersAction(
  action: PlayWithViewersApiAction,
  input: unknown,
  token: string
) {
  switch (action) {
    case "clearQueue":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.queue.clearQueue,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.queue.clearQueue
        >,
        { token }
      )
    case "createQueueInOwnedGuild":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild
        >,
        { token }
      )
    case "fixQueueChannelPermissions":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions
        >,
        { token }
      )
    case "inviteQueueEntryNowAndNotify":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.inviteQueueEntryNowAndNotify,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.inviteQueueEntryNowAndNotify
        >,
        { token }
      )
    case "listAvailableDiscordGuilds":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds,
        {} as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds
        >,
        { token }
      )
    case "publishQueueMessage":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage
        >,
        { token }
      )
    case "removeQueueEntry":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry
        >,
        { token }
      )
    case "selectNextBatchAndNotify":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.selectNextBatchAndNotify,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.selectNextBatchAndNotify
        >,
        { token }
      )
    case "setQueueActive":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.queue.setQueueActive,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.queue.setQueueActive
        >,
        { token }
      )
    case "syncQueueDiscordContext":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext
        >,
        { token }
      )
    case "updateQueueMessage":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage
        >,
        { token }
      )
    case "updateQueueSettings":
      return fetchAction(
        api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings,
        input as FunctionArgs<
          typeof api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings
        >,
        { token }
      )
  }
}

export async function POST(request: Request) {
  const csrfError = validateSameOriginJsonMutationRequest({
    headerName: PLAY_WITH_VIEWERS_CSRF_HEADER,
    headerValue: PLAY_WITH_VIEWERS_CSRF_HEADER_VALUE,
    request,
  })

  if (csrfError) {
    return NextResponse.json({ message: csrfError }, { status: 403 })
  }

  const { userId, getToken } = await auth()

  if (!userId) {
    return NextResponse.json(
      { message: "You need to sign in to use Play With Viewers." },
      { status: 401 }
    )
  }

  const token = await getToken({ template: "convex" }).catch(() => null)

  if (!token) {
    return NextResponse.json(
      { message: "Your session could not be validated. Refresh and try again." },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: "Invalid Play With Viewers request body." },
      { status: 400 }
    )
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("action" in body) ||
    !isPlayWithViewersAction(body.action)
  ) {
    return NextResponse.json(
      { message: "Unknown Play With Viewers action." },
      { status: 400 }
    )
  }

  const requestBody = body as PlayWithViewersMutationRequest

  try {
    const data = await runPlayWithViewersAction(
      requestBody.action,
      requestBody.input ?? {},
      token
    )

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      {
        message: toErrorMessage(
          error,
          "Play With Viewers request failed."
        ),
      },
      { status: 500 }
    )
  }
}
