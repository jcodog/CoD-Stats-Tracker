"use client"

import { useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import type { FunctionArgs, FunctionReturnType } from "convex/server"

import { api } from "@workspace/backend/convex/_generated/api"

import {
  PLAY_WITH_VIEWERS_CSRF_HEADER,
  PLAY_WITH_VIEWERS_CSRF_HEADER_VALUE,
  type PlayWithViewersApiAction,
} from "@/features/creator-tools/play-with-viewers/lib/play-with-viewers-api"

export class PlayWithViewersClientError extends Error {
  data: unknown
  status: number

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.data = data
    this.status = status
  }
}

function normalizePlayWithViewersErrorMessage(
  message: string | null | undefined,
  fallback: string
) {
  const trimmedMessage = message?.trim()

  if (!trimmedMessage) {
    return fallback
  }

  return trimmedMessage
    .replace(/^\[CONVEX [^\]]+\]\s*/u, "")
    .replace(/^Uncaught Error:\s*/u, "")
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

async function callPlayWithViewersApi<TResult>(
  action: PlayWithViewersApiAction,
  input: unknown
) {
  const response = await fetch("/api/creator-tools/play-with-viewers", {
    body: JSON.stringify({
      action,
      input,
    }),
    headers: {
      "content-type": "application/json",
      [PLAY_WITH_VIEWERS_CSRF_HEADER]: PLAY_WITH_VIEWERS_CSRF_HEADER_VALUE,
    },
    method: "POST",
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `Play With Viewers request failed (${response.status}).`

    throw new PlayWithViewersClientError(
      normalizePlayWithViewersErrorMessage(
        message,
        "Play With Viewers request failed."
      ),
      response.status,
      payload
    )
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload)
  ) {
    throw new PlayWithViewersClientError(
      "Play With Viewers returned an invalid response.",
      500,
      payload
    )
  }

  return payload.data as TResult
}

function usePlayWithViewersAction<TInput, TResult>(
  action: PlayWithViewersApiAction
) {
  const { mutateAsync } = useMutation({
    mutationFn: (input: TInput) => callPlayWithViewersApi<TResult>(action, input),
  })

  return useCallback(
    (input: TInput) => mutateAsync(input),
    [mutateAsync]
  )
}

export function useClearQueueAction() {
  return usePlayWithViewersAction<
    FunctionArgs<typeof api.actions.creatorTools.playingWithViewers.queue.clearQueue>,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.clearQueue
    >
  >("clearQueue")
}

export function useCreateQueueInOwnedGuildAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild
    >
  >("createQueueInOwnedGuild")
}

export function useFixQueueChannelPermissionsAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions
    >
  >("fixQueueChannelPermissions")
}

export function useInviteQueueEntryNowAndNotifyAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.inviteQueueEntryNowAndNotify
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.inviteQueueEntryNowAndNotify
    >
  >("inviteQueueEntryNowAndNotify")
}

export function useListAvailableDiscordGuildsAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds
    >
  >("listAvailableDiscordGuilds")
}

export function usePublishQueueMessageAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage
    >
  >("publishQueueMessage")
}

export function useRemoveQueueEntryAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry
    >
  >("removeQueueEntry")
}

export function useSelectNextBatchAndNotifyAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.selectNextBatchAndNotify
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.selectNextBatchAndNotify
    >
  >("selectNextBatchAndNotify")
}

export function useSetQueueActiveAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.setQueueActive
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.setQueueActive
    >
  >("setQueueActive")
}

export function useSyncQueueDiscordContextAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext
    >
  >("syncQueueDiscordContext")
}

export function useUpdateQueueMessageAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage
    >
  >("updateQueueMessage")
}

export function useUpdateQueueSettingsAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings
    >
  >("updateQueueSettings")
}
