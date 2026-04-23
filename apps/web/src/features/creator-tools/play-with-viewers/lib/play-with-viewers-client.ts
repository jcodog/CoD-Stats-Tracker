"use client"

import { useCallback } from "react"
import type { ConvexReactClient } from "convex/react"
import { useConvex } from "convex/react"
import { useMutation } from "@tanstack/react-query"
import type { FunctionArgs, FunctionReturnType } from "convex/server"

import { api } from "@workspace/backend/convex/_generated/api"

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

function toPlayWithViewersClientError(error: unknown, fallback: string) {
  if (error instanceof PlayWithViewersClientError) {
    return error
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500
  const message =
    error instanceof Error ? error.message : "Play With Viewers request failed."

  return new PlayWithViewersClientError(
    normalizePlayWithViewersErrorMessage(message, fallback),
    status,
    error
  )
}

function usePlayWithViewersAction<TInput, TResult>(args: {
  fallbackMessage: string
  mutationFn: (convex: ConvexReactClient, input: TInput) => Promise<TResult>
}) {
  const convex = useConvex()
  const { mutateAsync } = useMutation({
    mutationFn: async (input: TInput) => {
      try {
        return await args.mutationFn(convex, input)
      } catch (error) {
        throw toPlayWithViewersClientError(error, args.fallbackMessage)
      }
    },
  })

  return useCallback((input: TInput) => mutateAsync(input), [mutateAsync])
}

export function useClearQueueAction() {
  return usePlayWithViewersAction<
    FunctionArgs<typeof api.actions.creatorTools.playingWithViewers.queue.clearQueue>,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.clearQueue
    >
  >({
    fallbackMessage: "Unable to clear the Play With Viewers queue.",
    mutationFn: (convex, input) =>
      convex.action(api.actions.creatorTools.playingWithViewers.queue.clearQueue, input),
  })
}

export function useCreateQueueInOwnedGuildAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild
    >
  >({
    fallbackMessage: "Unable to create the Play With Viewers queue.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.discord.createQueueInOwnedGuild,
        input
      ),
  })
}

export function useFixQueueChannelPermissionsAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions
    >
  >({
    fallbackMessage: "Unable to update the Play With Viewers Discord permissions.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.discord.fixQueueChannelPermissions,
        input
      ),
  })
}

export function useInviteQueueEntryNowAndNotifyAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.inviteQueueEntryNowAndNotify
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.inviteQueueEntryNowAndNotify
    >
  >({
    fallbackMessage: "Unable to invite that viewer right now.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.queue.inviteQueueEntryNowAndNotify,
        input
      ),
  })
}

export function useListAvailableDiscordGuildsAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds
    >
  >({
    fallbackMessage: "Unable to load eligible Discord servers.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.discord.listAvailableDiscordGuilds,
        input
      ),
  })
}

export function usePublishQueueMessageAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage
    >
  >({
    fallbackMessage: "Unable to publish the queue message.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage,
        input
      ),
  })
}

export function useRemoveQueueEntryAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry
    >
  >({
    fallbackMessage: "Unable to remove that queue entry.",
    mutationFn: (convex, input) =>
      convex.action(api.actions.creatorTools.playingWithViewers.queue.removeQueueEntry, input),
  })
}

export function useSelectNextBatchAndNotifyAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.selectNextBatchAndNotify
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.selectNextBatchAndNotify
    >
  >({
    fallbackMessage: "Unable to select the next viewer batch.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.queue.selectNextBatchAndNotify,
        input
      ),
  })
}

export function useSetQueueActiveAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.setQueueActive
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.setQueueActive
    >
  >({
    fallbackMessage: "Unable to update the queue status.",
    mutationFn: (convex, input) =>
      convex.action(api.actions.creatorTools.playingWithViewers.queue.setQueueActive, input),
  })
}

export function useSyncQueueDiscordContextAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext
    >
  >({
    fallbackMessage: "Unable to sync the Play With Viewers Discord context.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.discord.syncQueueDiscordContext,
        input
      ),
  })
}

export function useUpdateQueueMessageAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage
    >
  >({
    fallbackMessage: "Unable to refresh the queue message.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage,
        input
      ),
  })
}

export function useUpdateQueueSettingsAction() {
  return usePlayWithViewersAction<
    FunctionArgs<
      typeof api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings
    >,
    FunctionReturnType<
      typeof api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings
    >
  >({
    fallbackMessage: "Unable to save the queue settings.",
    mutationFn: (convex, input) =>
      convex.action(
        api.actions.creatorTools.playingWithViewers.queue.updateQueueSettings,
        input
      ),
  })
}
