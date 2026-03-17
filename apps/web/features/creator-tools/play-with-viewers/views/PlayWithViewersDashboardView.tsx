"use client"

import Link from "next/link"
import { startTransition, useEffect, useMemo, useState } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconAt,
  IconBrandDiscord,
  IconBrandTwitch,
  IconCopy,
  IconLock,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"

import { api } from "@workspace/backend/convex/_generated/api"
import type { Doc, Id } from "@workspace/backend/convex/_generated/dataModel"
import type { RankValue } from "@workspace/backend/lib/playingWithViewers"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"

type ViewerQueue = Doc<"viewerQueues">
type ViewerQueueEntry = Doc<"viewerQueueEntries">
type ViewerQueueRound = Doc<"viewerQueueRounds">
type InviteMode = ViewerQueue["inviteMode"]

type QueueFormState = {
  channelId: string
  creatorDisplayName: string
  creatorMessage: string
  gameLabel: string
  guildId: string
  inviteMode: InviteMode
  matchesPerViewer: string
  maxRank: RankValue
  minRank: RankValue
  playersPerBatch: string
  rulesText: string
  title: string
}

type SelectionDialogState =
  | { kind: "batch" }
  | {
      displayName: string
      entryId: Id<"viewerQueueEntries">
      kind: "entry"
    }
  | null

const rankOptions: Array<{ label: string; value: RankValue }> = [
  { label: "Bronze", value: "bronze" },
  { label: "Silver", value: "silver" },
  { label: "Gold", value: "gold" },
  { label: "Platinum", value: "platinum" },
  { label: "Diamond", value: "diamond" },
  { label: "Crimson", value: "crimson" },
  { label: "Iridescent", value: "iridescent" },
  { label: "Top 250", value: "top250" },
]

const inviteModeOptions: Array<{ label: string; value: InviteMode }> = [
  { label: "Discord DM", value: "discord_dm" },
  { label: "Manual contact", value: "manual_creator_contact" },
]

const playersPerBatchOptions = [1, 2, 3, 4, 5, 6, 8]
const matchesPerViewerOptions = [1, 2, 3, 4, 5]
const rankOrder = new Map(rankOptions.map((option, index) => [option.value, index]))
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
})

function getDefaultQueueFormState(name: string): QueueFormState {
  const trimmedName = name.trim()
  const resolvedName = trimmedName || "Creator"

  return {
    channelId: "",
    creatorDisplayName: resolvedName,
    creatorMessage: "",
    gameLabel: "Call of Duty",
    guildId: "",
    inviteMode: "manual_creator_contact",
    matchesPerViewer: "1",
    maxRank: "top250",
    minRank: "bronze",
    playersPerBatch: "4",
    rulesText: "",
    title: `Play with ${resolvedName}`,
  }
}

function toQueueFormState(queue: ViewerQueue): QueueFormState {
  return {
    channelId: queue.channelId,
    creatorDisplayName: queue.creatorDisplayName,
    creatorMessage: queue.creatorMessage ?? "",
    gameLabel: queue.gameLabel,
    guildId: queue.guildId,
    inviteMode: queue.inviteMode,
    matchesPerViewer: String(queue.matchesPerViewer),
    maxRank: queue.maxRank,
    minRank: queue.minRank,
    playersPerBatch: String(queue.playersPerBatch),
    rulesText: queue.rulesText ?? "",
    title: queue.title,
  }
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function getRankLabel(rank: RankValue) {
  return rankOptions.find((option) => option.value === rank)?.label ?? rank
}

function getInviteModeLabel(mode: InviteMode) {
  return inviteModeOptions.find((option) => option.value === mode)?.label ?? mode
}

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (words.length === 0) {
    return "PW"
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("")
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function formatWaitDuration(joinedAt: number, now: number) {
  const deltaSeconds = Math.max(0, Math.floor((now - joinedAt) / 1000))

  if (deltaSeconds < 60) {
    return relativeTimeFormatter.format(-deltaSeconds, "second")
  }

  const deltaMinutes = Math.floor(deltaSeconds / 60)
  if (deltaMinutes < 60) {
    return relativeTimeFormatter.format(-deltaMinutes, "minute")
  }

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) {
    return relativeTimeFormatter.format(-deltaHours, "hour")
  }

  const deltaDays = Math.floor(deltaHours / 24)
  return relativeTimeFormatter.format(-deltaDays, "day")
}

function formatDiscordContext(queue: ViewerQueue | null) {
  if (!queue) {
    return "Discord channel not configured"
  }

  return `Guild ${queue.guildId} / Channel ${queue.channelId}`
}

function isRankRangeValid(minRank: RankValue, maxRank: RankValue) {
  return (rankOrder.get(minRank) ?? 0) <= (rankOrder.get(maxRank) ?? 0)
}

function normalizeRankBounds(minRank: RankValue, maxRank: RankValue) {
  if (isRankRangeValid(minRank, maxRank)) {
    return { maxRank, minRank }
  }

  return { maxRank: minRank, minRank }
}

function isRankWithinRange(
  rank: RankValue,
  minRank: RankValue,
  maxRank: RankValue
) {
  const weight = rankOrder.get(rank) ?? 0
  return (
    weight >= (rankOrder.get(minRank) ?? 0) &&
    weight <= (rankOrder.get(maxRank) ?? 0)
  )
}

function Panel({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border/70 bg-card/80",
        className
      )}
    >
      {children}
    </section>
  )
}

function ToolbarGroup({
  children,
  label,
}: Readonly<{ children: React.ReactNode; label: string }>) {
  return (
    <div className="flex items-center gap-2 border-r border-border/70 pr-4 last:border-r-0 last:pr-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function QueueLoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4">
        <Skeleton className="h-8 w-56" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-4 w-80" />
      </div>

      <Skeleton className="h-14 rounded-lg" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel>
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-border/70 px-4 py-3">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function LockedState({ queueTitle }: Readonly<{ queueTitle: string }>) {
  return (
    <Panel className="border-dashed bg-muted/20">
      <div className="flex flex-col gap-4 px-5 py-6 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background">
            <IconLock />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium">Twitch connection required</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {queueTitle} stays locked until this creator account has a Twitch
              profile linked. Once linked, the queue controls, waiting list, and
              batch selection surface become available again.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/account">Open account</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function LatestRoundPanel({
  latestRound,
  onCopyMentions,
  onCopyUsernames,
}: Readonly<{
  latestRound: ViewerQueueRound | null | undefined
  onCopyMentions: () => Promise<void>
  onCopyUsernames: () => Promise<void>
}>) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Latest selected batch</h2>
          <p className="text-sm text-muted-foreground">
            Most recent viewers moved out of the active waiting list.
          </p>
        </div>
        {latestRound ? (
          <Badge variant="outline">{latestRound.selectedCount} selected</Badge>
        ) : null}
      </div>
      {latestRound === undefined ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : latestRound === null ? (
        <Empty className="min-h-64 rounded-none border-0 p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUsers />
            </EmptyMedia>
            <EmptyTitle>No batch selected yet</EmptyTitle>
            <EmptyDescription>
              Run the next batch flow when you are ready to pull viewers out of
              the queue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
            <Badge variant="secondary">
              {getInviteModeLabel(latestRound.mode)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDateTime(latestRound.createdAt)}
            </span>
            {latestRound.lobbyCode ? (
              <span className="rounded-md border border-border/70 bg-background px-2 py-1 font-mono text-xs text-foreground">
                Lobby {latestRound.lobbyCode}
              </span>
            ) : null}
          </div>

          {latestRound.mode === "manual_creator_contact" ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
              <Button onClick={onCopyUsernames} size="sm" variant="outline">
                <IconCopy data-icon="inline-start" />
                Copy usernames
              </Button>
              <Button onClick={onCopyMentions} size="sm" variant="outline">
                <IconAt data-icon="inline-start" />
                Copy mentions
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col divide-y divide-border/70">
            {latestRound.selectedUsers.map((user) => (
              <div
                key={`${latestRound._id}-${user.discordUserId}`}
                className="flex flex-col gap-2 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {user.displayName}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      @{user.username}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant="outline">{getRankLabel(user.rank)}</Badge>
                    {user.dmStatus ? (
                      <Badge
                        variant={
                          user.dmStatus === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {user.dmStatus === "failed" ? "DM failed" : "DM sent"}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {user.dmFailureReason ? (
                  <p className="text-sm text-destructive">
                    {user.dmFailureReason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

type PlayWithViewersDashboardViewProps = {
  hasTwitchLinked: boolean
}

export function PlayWithViewersDashboardView({
  hasTwitchLinked,
}: PlayWithViewersDashboardViewProps) {
  const currentUser = useQuery(api.queries.users.current)
  const queue = useQuery(
    api.queries.creatorTools.playingWithViewers.queue.getQueueByCreatorUserId,
    currentUser?._id ? { creatorUserId: currentUser._id } : "skip"
  ) as ViewerQueue | null | undefined
  const queueEntries = useQuery(
    api.queries.creatorTools.playingWithViewers.queue.getQueueEntries,
    queue?._id ? { queueId: queue._id } : "skip"
  ) as ViewerQueueEntry[] | undefined
  const latestRound = useQuery(
    api.queries.creatorTools.playingWithViewers.queue.getLatestQueueRound,
    queue?._id ? { queueId: queue._id } : "skip"
  ) as ViewerQueueRound | null | undefined

  const createQueue = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.createQueue
  )
  const updateQueueSettings = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.updateQueueSettings
  )
  const setQueueActive = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.setQueueActive
  )
  const clearQueue = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.clearQueue
  )
  const removeQueueEntry = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.removeQueueEntry
  )
  const selectNextBatch = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.selectNextBatch
  )
  const inviteQueueEntryNow = useMutation(
    api.mutations.creatorTools.playingWithViewers.queue.inviteQueueEntryNow
  )
  const publishQueueMessage = useAction(
    api.actions.creatorTools.playingWithViewers.discord.publishQueueMessage
  )
  const refreshQueueMessage = useAction(
    api.actions.creatorTools.playingWithViewers.discord.updateQueueMessage
  )

  const [now, setNow] = useState(() => Date.now())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectionDialogState, setSelectionDialogState] =
    useState<SelectionDialogState>(null)
  const [selectionLobbyCode, setSelectionLobbyCode] = useState("")
  const [createFormState, setCreateFormState] = useState<QueueFormState>(() =>
    getDefaultQueueFormState("")
  )
  const [settingsFormState, setSettingsFormState] = useState<QueueFormState>(
    () => getDefaultQueueFormState("")
  )
  const [isCreatingQueue, setIsCreatingQueue] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingQueue, setIsClearingQueue] = useState(false)
  const [isSelectingBatch, setIsSelectingBatch] = useState(false)
  const [toolbarFieldPending, setToolbarFieldPending] = useState<string | null>(
    null
  )
  const [removingEntryId, setRemovingEntryId] =
    useState<Id<"viewerQueueEntries"> | null>(null)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setNow(Date.now())
      })
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (queue === undefined || queue !== null || currentUser === undefined) {
      return
    }

    setCreateFormState(getDefaultQueueFormState(currentUser?.name ?? ""))
  }, [currentUser, queue])

  useEffect(() => {
    if (!queue || settingsOpen) {
      return
    }

    setSettingsFormState(toQueueFormState(queue))
  }, [queue, settingsOpen])

  const entries = queueEntries ?? []
  const eligibleEntriesCount = useMemo(() => {
    if (!queue) {
      return 0
    }

    return entries.filter((entry) =>
      isRankWithinRange(entry.rank, queue.minRank, queue.maxRank)
    ).length
  }, [entries, queue])

  const isLoadingQueue =
    currentUser === undefined ||
    (currentUser !== null && queue === undefined) ||
    (queue !== null &&
      queue !== undefined &&
      (queueEntries === undefined || latestRound === undefined))

  async function syncQueueMessageIfPublished(queueId: Id<"viewerQueues">) {
    if (!queue?.messageId) {
      return
    }

    try {
      await refreshQueueMessage({ queueId })
    } catch {
      // Keep the queue mutation successful even if Discord refresh fails.
    }
  }

  async function handleCopyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error("Clipboard access is not available right now.")
    }
  }

  async function handleCopyMentions() {
    if (!latestRound || latestRound === undefined) {
      return
    }

    await handleCopyToClipboard(
      latestRound.selectedUsers
        .map((user) => `<@${user.discordUserId}>`)
        .join("\n"),
      "Mentions copied."
    )
  }

  async function handleCopyUsernames() {
    if (!latestRound || latestRound === undefined) {
      return
    }

    await handleCopyToClipboard(
      latestRound.selectedUsers.map((user) => user.username).join("\n"),
      "Usernames copied."
    )
  }

  async function handleCreateQueue() {
    if (!currentUser?._id) {
      toast.error("Unable to resolve your creator account.")
      return
    }

    const normalizedRanks = normalizeRankBounds(
      createFormState.minRank,
      createFormState.maxRank
    )

    setIsCreatingQueue(true)

    try {
      await createQueue({
        channelId: createFormState.channelId.trim(),
        creatorDisplayName: createFormState.creatorDisplayName.trim(),
        creatorMessage: createFormState.creatorMessage.trim() || undefined,
        creatorUserId: currentUser._id,
        gameLabel: createFormState.gameLabel.trim(),
        guildId: createFormState.guildId.trim(),
        inviteMode: createFormState.inviteMode,
        matchesPerViewer: Number(createFormState.matchesPerViewer),
        maxRank: normalizedRanks.maxRank,
        minRank: normalizedRanks.minRank,
        playersPerBatch: Number(createFormState.playersPerBatch),
        rulesText: createFormState.rulesText.trim() || undefined,
        title: createFormState.title.trim(),
      })

      toast.success("Queue created.")
      setSettingsOpen(false)
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to create the queue."))
    } finally {
      setIsCreatingQueue(false)
    }
  }

  async function handleSaveSettings() {
    if (!queue) {
      return
    }

    const normalizedRanks = normalizeRankBounds(
      settingsFormState.minRank,
      settingsFormState.maxRank
    )

    setIsSavingSettings(true)

    try {
      await updateQueueSettings({
        creatorDisplayName: settingsFormState.creatorDisplayName.trim(),
        creatorMessage: settingsFormState.creatorMessage.trim() || undefined,
        gameLabel: settingsFormState.gameLabel.trim(),
        inviteMode: settingsFormState.inviteMode,
        matchesPerViewer: Number(settingsFormState.matchesPerViewer),
        maxRank: normalizedRanks.maxRank,
        minRank: normalizedRanks.minRank,
        playersPerBatch: Number(settingsFormState.playersPerBatch),
        queueId: queue._id,
        rulesText: settingsFormState.rulesText.trim() || undefined,
        title: settingsFormState.title.trim(),
      })

      await syncQueueMessageIfPublished(queue._id)
      toast.success("Queue settings saved.")
      setSettingsOpen(false)
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to save queue settings."))
    } finally {
      setIsSavingSettings(false)
    }
  }

  async function handleToolbarSettingsChange(
    field: string,
    patch: Partial<
      Pick<
        ViewerQueue,
        "inviteMode" | "matchesPerViewer" | "maxRank" | "minRank" | "playersPerBatch"
      >
    >
  ) {
    if (!queue) {
      return
    }

    const normalizedRanks = normalizeRankBounds(
      patch.minRank ?? queue.minRank,
      patch.maxRank ?? queue.maxRank
    )

    setToolbarFieldPending(field)

    try {
      await updateQueueSettings({
        creatorDisplayName: queue.creatorDisplayName,
        creatorMessage: queue.creatorMessage,
        gameLabel: queue.gameLabel,
        inviteMode: patch.inviteMode ?? queue.inviteMode,
        matchesPerViewer: patch.matchesPerViewer ?? queue.matchesPerViewer,
        maxRank: normalizedRanks.maxRank,
        minRank: normalizedRanks.minRank,
        playersPerBatch: patch.playersPerBatch ?? queue.playersPerBatch,
        queueId: queue._id,
        rulesText: queue.rulesText,
        title: queue.title,
      })

      await syncQueueMessageIfPublished(queue._id)
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to update queue controls."))
    } finally {
      setToolbarFieldPending(null)
    }
  }

  async function handleToggleQueueActive(nextValue: boolean) {
    if (!queue) {
      return
    }

    setToolbarFieldPending("active")

    try {
      await setQueueActive({
        isActive: nextValue,
        queueId: queue._id,
      })

      await syncQueueMessageIfPublished(queue._id)
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to change queue state."))
    } finally {
      setToolbarFieldPending(null)
    }
  }

  async function handlePublishQueueMessage() {
    if (!queue) {
      return
    }

    setIsPublishing(true)

    try {
      await publishQueueMessage({ queueId: queue._id })
      toast.success("Queue message published to Discord.")
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to publish queue message."))
    } finally {
      setIsPublishing(false)
    }
  }

  async function handleRefreshQueueMessage() {
    if (!queue) {
      return
    }

    setIsRefreshing(true)

    try {
      await refreshQueueMessage({ queueId: queue._id })
      toast.success("Queue message refreshed.")
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to refresh queue message."))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleRemoveEntry(entryId: Id<"viewerQueueEntries">) {
    if (!queue) {
      return
    }

    setRemovingEntryId(entryId)

    try {
      await removeQueueEntry({ entryId })
      await syncQueueMessageIfPublished(queue._id)
      toast.success("Viewer removed from the queue.")
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to remove this viewer."))
    } finally {
      setRemovingEntryId(null)
    }
  }

  async function handleClearQueue() {
    if (!queue) {
      return
    }

    setIsClearingQueue(true)

    try {
      await clearQueue({ queueId: queue._id })
      await syncQueueMessageIfPublished(queue._id)
      toast.success("Queue cleared.")
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to clear the queue."))
    } finally {
      setIsClearingQueue(false)
    }
  }

  async function handleConfirmSelection() {
    if (!queue) {
      return
    }

    const lobbyCode = selectionLobbyCode.trim() || undefined
    if (queue.inviteMode === "discord_dm" && !lobbyCode) {
      toast.error("Lobby code is required for Discord DM mode.")
      return
    }

    setIsSelectingBatch(true)

    try {
      if (selectionDialogState?.kind === "entry") {
        await inviteQueueEntryNow({
          entryId: selectionDialogState.entryId,
          lobbyCode,
        })
        toast.success(
          `${selectionDialogState.displayName} moved into the latest round.`
        )
      } else {
        const result = await selectNextBatch({
          lobbyCode,
          queueId: queue._id,
        })

        toast.success(
          `Selected ${result.selectedCount} viewer${result.selectedCount === 1 ? "" : "s"}.`
        )
      }

      await syncQueueMessageIfPublished(queue._id)
      setSelectionDialogState(null)
      setSelectionLobbyCode("")
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to select viewers right now."))
    } finally {
      setIsSelectingBatch(false)
    }
  }

  function openSelectionDialog(state: SelectionDialogState) {
    setSelectionDialogState(state)
    setSelectionLobbyCode("")
  }

  if (isLoadingQueue) {
    return <QueueLoadingState />
  }

  if (currentUser === null) {
    return (
      <Empty className="min-h-[420px] rounded-lg border border-border/70">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconLock />
          </EmptyMedia>
          <EmptyTitle>Sign in to manage creator tools</EmptyTitle>
          <EmptyDescription>
            This workspace needs an authenticated creator account before the queue
            dashboard can load.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const pageTitle = queue?.title ?? "Play With Viewers"

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {queue ? (
                <Badge variant={queue.isActive ? "default" : "outline"}>
                  {queue.isActive ? "Active" : "Inactive"}
                </Badge>
              ) : (
                <Badge variant="outline">Not configured</Badge>
              )}
              <Badge
                variant={
                  queue?.lastMessageSyncError
                    ? "destructive"
                    : queue?.messageId
                      ? "secondary"
                      : "outline"
                }
              >
                {queue?.lastMessageSyncError
                  ? "Discord sync issue"
                  : queue?.messageId
                    ? "Published"
                    : "Not published"}
              </Badge>
              <Badge variant={hasTwitchLinked ? "secondary" : "destructive"}>
                {hasTwitchLinked ? "Twitch linked" : "Twitch required"}
              </Badge>
            </div>
          </div>

          {queue ? (
            <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground lg:items-end">
              <span>{queue.creatorDisplayName}</span>
              <span>{queue.gameLabel}</span>
              <span>{entries.length} waiting</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <IconBrandDiscord />
            {formatDiscordContext(queue ?? null)}
          </span>
          {queue?.messageId ? (
            <span className="font-mono text-xs text-foreground">
              Message {queue.messageId}
            </span>
          ) : null}
          {queue ? (
            <span className="inline-flex items-center gap-1.5">
              <IconBrandTwitch />
              {hasTwitchLinked ? "Creator tools unlocked" : "Tools locked"}
            </span>
          ) : null}
        </div>
      </header>

      {queue?.lastMessageSyncError ? (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>Discord sync error</AlertTitle>
          <AlertDescription>{queue.lastMessageSyncError}</AlertDescription>
        </Alert>
      ) : null}

      {!hasTwitchLinked ? (
        <LockedState queueTitle={pageTitle} />
      ) : queue === null ? (
        <Panel className="border-dashed bg-muted/20">
          <Empty className="min-h-[420px] rounded-none border-0 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconUsers />
              </EmptyMedia>
              <EmptyTitle>No queue configured yet</EmptyTitle>
              <EmptyDescription>
                Create the first Play With Viewers queue, choose the Discord
                channel it should publish into, and the operational dashboard
                will load on this page.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              onClick={() => setSettingsOpen(true)}
              size="sm"
              variant="default"
            >
              <IconSettings data-icon="inline-start" />
              Create queue
            </Button>
          </Empty>
        </Panel>
      ) : queue ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-center gap-3 overflow-x-auto px-4 py-3">
              <ToolbarGroup label="State">
                <span
                  className={cn(
                    "text-sm font-medium",
                    queue.isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {queue.isActive ? "Open" : "Closed"}
                </span>
                <Switch
                  checked={queue.isActive}
                  disabled={toolbarFieldPending === "active"}
                  onCheckedChange={handleToggleQueueActive}
                  size="sm"
                />
              </ToolbarGroup>

              <ToolbarGroup label="Ranks">
                <NativeSelect
                  disabled={toolbarFieldPending !== null}
                  onChange={(event) =>
                    handleToolbarSettingsChange("minRank", {
                      minRank: event.target.value as RankValue,
                    })
                  }
                  size="sm"
                  value={queue.minRank}
                >
                  {rankOptions.map((option) => (
                    <NativeSelectOption key={`min-${option.value}`} value={option.value}>
                      Min {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  disabled={toolbarFieldPending !== null}
                  onChange={(event) =>
                    handleToolbarSettingsChange("maxRank", {
                      maxRank: event.target.value as RankValue,
                    })
                  }
                  size="sm"
                  value={queue.maxRank}
                >
                  {rankOptions.map((option) => (
                    <NativeSelectOption key={`max-${option.value}`} value={option.value}>
                      Max {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </ToolbarGroup>

              <ToolbarGroup label="Batch">
                <NativeSelect
                  disabled={toolbarFieldPending !== null}
                  onChange={(event) =>
                    handleToolbarSettingsChange("playersPerBatch", {
                      playersPerBatch: Number(event.target.value),
                    })
                  }
                  size="sm"
                  value={String(queue.playersPerBatch)}
                >
                  {playersPerBatchOptions.map((value) => (
                    <NativeSelectOption key={value} value={String(value)}>
                      {value} per batch
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  disabled={toolbarFieldPending !== null}
                  onChange={(event) =>
                    handleToolbarSettingsChange("matchesPerViewer", {
                      matchesPerViewer: Number(event.target.value),
                    })
                  }
                  size="sm"
                  value={String(queue.matchesPerViewer)}
                >
                  {matchesPerViewerOptions.map((value) => (
                    <NativeSelectOption key={value} value={String(value)}>
                      {value} match{value === 1 ? "" : "es"}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </ToolbarGroup>

              <ToolbarGroup label="Invite mode">
                <NativeSelect
                  disabled={toolbarFieldPending !== null}
                  onChange={(event) =>
                    handleToolbarSettingsChange("inviteMode", {
                      inviteMode: event.target.value as InviteMode,
                    })
                  }
                  size="sm"
                  value={queue.inviteMode}
                >
                  {inviteModeOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </ToolbarGroup>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setSettingsOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <IconSettings data-icon="inline-start" />
                  Settings
                </Button>
                <Button
                  disabled={Boolean(queue.messageId) || isPublishing}
                  onClick={handlePublishQueueMessage}
                  size="sm"
                  variant="outline"
                >
                  <IconBrandDiscord data-icon="inline-start" />
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
                <Button
                  disabled={!queue.messageId || isRefreshing}
                  onClick={handleRefreshQueueMessage}
                  size="sm"
                  variant="outline"
                >
                  <IconRefresh data-icon="inline-start" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={entries.length === 0 || isClearingQueue}
                      size="sm"
                      variant="ghost"
                    >
                      <IconTrash data-icon="inline-start" />
                      {isClearingQueue ? "Clearing..." : "Clear queue"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear the active queue?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes every waiting viewer. The latest selected
                        batch stays intact.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearQueue}
                        variant="destructive"
                      >
                        Clear queue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  disabled={entries.length === 0}
                  onClick={() => openSelectionDialog({ kind: "batch" })}
                  size="sm"
                >
                  <IconArrowRight data-icon="inline-start" />
                  Next batch
                </Button>
              </div>
            </div>
          </Panel>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Panel className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-medium">Active waiting list</h2>
                  <p className="text-sm text-muted-foreground">
                    {entries.length} waiting
                    {entries.length > 0
                      ? ` · ${eligibleEntriesCount} within the current rank band`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline">
                  {queue.playersPerBatch} per batch
                </Badge>
              </div>

              {entries.length === 0 ? (
                <Empty className="min-h-[420px] rounded-none border-0 p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <IconUsers />
                    </EmptyMedia>
                    <EmptyTitle>No viewers are waiting</EmptyTitle>
                    <EmptyDescription>
                      Publish the Discord queue message, then viewers can join
                      from Discord and appear here in arrival order.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ScrollArea className="max-h-[620px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Position</TableHead>
                        <TableHead className="min-w-[220px]">Viewer</TableHead>
                        <TableHead className="w-28">Rank</TableHead>
                        <TableHead className="w-44">Joined</TableHead>
                        <TableHead className="w-28">Waiting</TableHead>
                        <TableHead className="w-[180px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, index) => (
                        <TableRow key={entry._id}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback>
                                  {getInitials(entry.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">
                                  {entry.displayName}
                                </div>
                                <div className="truncate text-sm text-muted-foreground">
                                  @{entry.username}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getRankLabel(entry.rank)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(entry.joinedAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatWaitDuration(entry.joinedAt, now)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                disabled={isSelectingBatch}
                                onClick={() =>
                                  openSelectionDialog({
                                    displayName: entry.displayName,
                                    entryId: entry._id,
                                    kind: "entry",
                                  })
                                }
                                size="xs"
                                variant="outline"
                              >
                                Invite now
                              </Button>
                              <Button
                                disabled={removingEntryId === entry._id}
                                onClick={() => handleRemoveEntry(entry._id)}
                                size="xs"
                                variant="ghost"
                              >
                                {removingEntryId === entry._id
                                  ? "Removing..."
                                  : "Remove"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </Panel>

            <LatestRoundPanel
              latestRound={latestRound}
              onCopyMentions={handleCopyMentions}
              onCopyUsernames={handleCopyUsernames}
            />
          </div>
        </>
      ) : null}

      <Sheet onOpenChange={setSettingsOpen} open={settingsOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {queue ? "Queue settings" : "Create Play With Viewers queue"}
            </SheetTitle>
            <SheetDescription>
              {queue
                ? "Edit the operational queue configuration without leaving the dashboard."
                : "Configure the queue, choose the Discord destination, and create the creator control surface."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 pt-0">
              <FieldGroup>
                {!queue ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="pwv-guild-id">Discord server ID</FieldLabel>
                      <Input
                        id="pwv-guild-id"
                        onChange={(event) =>
                          setCreateFormState((current) => ({
                            ...current,
                            guildId: event.target.value,
                          }))
                        }
                        placeholder="123456789012345678"
                        value={createFormState.guildId}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="pwv-channel-id">Discord channel ID</FieldLabel>
                      <Input
                        id="pwv-channel-id"
                        onChange={(event) =>
                          setCreateFormState((current) => ({
                            ...current,
                            channelId: event.target.value,
                          }))
                        }
                        placeholder="123456789012345678"
                        value={createFormState.channelId}
                      />
                    </Field>
                  </>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="pwv-title">Queue title</FieldLabel>
                  <Input
                    id="pwv-title"
                    onChange={(event) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                    }
                    value={queue ? settingsFormState.title : createFormState.title}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-creator-name">
                    Creator display name
                  </FieldLabel>
                  <Input
                    id="pwv-creator-name"
                    onChange={(event) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            creatorDisplayName: event.target.value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            creatorDisplayName: event.target.value,
                          }))
                    }
                    value={
                      queue
                        ? settingsFormState.creatorDisplayName
                        : createFormState.creatorDisplayName
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pwv-game-label">Game label</FieldLabel>
                  <Input
                    id="pwv-game-label"
                    onChange={(event) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            gameLabel: event.target.value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            gameLabel: event.target.value,
                          }))
                    }
                    value={queue ? settingsFormState.gameLabel : createFormState.gameLabel}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-creator-message">
                    Creator message
                  </FieldLabel>
                  <Textarea
                    id="pwv-creator-message"
                    onChange={(event) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            creatorMessage: event.target.value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            creatorMessage: event.target.value,
                          }))
                    }
                    value={
                      queue
                        ? settingsFormState.creatorMessage
                        : createFormState.creatorMessage
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-rules">Rules text</FieldLabel>
                  <Textarea
                    id="pwv-rules"
                    onChange={(event) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            rulesText: event.target.value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            rulesText: event.target.value,
                          }))
                    }
                    value={queue ? settingsFormState.rulesText : createFormState.rulesText}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="pwv-players-per-batch">
                      Players per batch
                    </FieldLabel>
                    <NativeSelect
                      id="pwv-players-per-batch"
                      onChange={(event) =>
                        queue
                          ? setSettingsFormState((current) => ({
                              ...current,
                              playersPerBatch: event.target.value,
                            }))
                          : setCreateFormState((current) => ({
                              ...current,
                              playersPerBatch: event.target.value,
                            }))
                      }
                      value={
                        queue
                          ? settingsFormState.playersPerBatch
                          : createFormState.playersPerBatch
                      }
                    >
                      {playersPerBatchOptions.map((value) => (
                        <NativeSelectOption key={`sheet-batch-${value}`} value={String(value)}>
                          {value}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pwv-matches-per-viewer">
                      Matches per viewer
                    </FieldLabel>
                    <NativeSelect
                      id="pwv-matches-per-viewer"
                      onChange={(event) =>
                        queue
                          ? setSettingsFormState((current) => ({
                              ...current,
                              matchesPerViewer: event.target.value,
                            }))
                          : setCreateFormState((current) => ({
                              ...current,
                              matchesPerViewer: event.target.value,
                            }))
                      }
                      value={
                        queue
                          ? settingsFormState.matchesPerViewer
                          : createFormState.matchesPerViewer
                      }
                    >
                      {matchesPerViewerOptions.map((value) => (
                        <NativeSelectOption
                          key={`sheet-matches-${value}`}
                          value={String(value)}
                        >
                          {value}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="pwv-min-rank">Minimum rank</FieldLabel>
                    <NativeSelect
                      id="pwv-min-rank"
                      onChange={(event) =>
                        queue
                          ? setSettingsFormState((current) => ({
                              ...current,
                              minRank: event.target.value as RankValue,
                            }))
                          : setCreateFormState((current) => ({
                              ...current,
                              minRank: event.target.value as RankValue,
                            }))
                      }
                      value={queue ? settingsFormState.minRank : createFormState.minRank}
                    >
                      {rankOptions.map((option) => (
                        <NativeSelectOption key={`sheet-min-${option.value}`} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pwv-max-rank">Maximum rank</FieldLabel>
                    <NativeSelect
                      id="pwv-max-rank"
                      onChange={(event) =>
                        queue
                          ? setSettingsFormState((current) => ({
                              ...current,
                              maxRank: event.target.value as RankValue,
                            }))
                          : setCreateFormState((current) => ({
                              ...current,
                              maxRank: event.target.value as RankValue,
                            }))
                      }
                      value={queue ? settingsFormState.maxRank : createFormState.maxRank}
                    >
                      {rankOptions.map((option) => (
                        <NativeSelectOption key={`sheet-max-${option.value}`} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="pwv-invite-mode">Invite mode</FieldLabel>
                  <NativeSelect
                    id="pwv-invite-mode"
                    onChange={(event) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            inviteMode: event.target.value as InviteMode,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            inviteMode: event.target.value as InviteMode,
                          }))
                    }
                    value={queue ? settingsFormState.inviteMode : createFormState.inviteMode}
                  >
                    {inviteModeOptions.map((option) => (
                      <NativeSelectOption key={`sheet-mode-${option.value}`} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    {queue
                      ? `Discord target stays fixed on ${formatDiscordContext(queue)}.`
                      : "Discord DM mode requires a lobby code when selecting viewers."}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </div>
          </ScrollArea>

          <SheetFooter>
            <Button onClick={() => setSettingsOpen(false)} size="sm" variant="outline">
              Cancel
            </Button>
            {queue ? (
              <Button disabled={isSavingSettings} onClick={handleSaveSettings} size="sm">
                {isSavingSettings ? "Saving..." : "Save settings"}
              </Button>
            ) : (
              <Button disabled={isCreatingQueue} onClick={handleCreateQueue} size="sm">
                {isCreatingQueue ? "Creating..." : "Create queue"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectionDialogState(null)
            setSelectionLobbyCode("")
          }
        }}
        open={selectionDialogState !== null}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectionDialogState?.kind === "entry"
                ? `Invite ${selectionDialogState.displayName}`
                : "Select next batch"}
            </DialogTitle>
            <DialogDescription>
              {selectionDialogState?.kind === "entry"
                ? "This moves a single waiting viewer into the latest round immediately."
                : "This uses the existing queue selection flow and writes the chosen viewers into the latest round."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            {queue?.inviteMode === "discord_dm" ? (
              <Field>
                <FieldLabel htmlFor="pwv-lobby-code">Lobby code</FieldLabel>
                <Input
                  id="pwv-lobby-code"
                  onChange={(event) => setSelectionLobbyCode(event.target.value)}
                  placeholder="Enter the lobby code to DM"
                  value={selectionLobbyCode}
                />
                <FieldDescription>
                  Discord DM mode requires a lobby code before the round can be created.
                </FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel>Manual contact mode</FieldLabel>
                <FieldDescription>
                  The selected viewers will appear in the latest batch panel with
                  copy helpers for mentions and usernames.
                </FieldDescription>
              </Field>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button onClick={() => setSelectionDialogState(null)} variant="outline">
              Cancel
            </Button>
            <Button disabled={isSelectingBatch} onClick={handleConfirmSelection}>
              {isSelectingBatch
                ? "Running..."
                : selectionDialogState?.kind === "entry"
                  ? "Invite now"
                  : "Select batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
