"use client"

import Link from "next/link"
import { startTransition, useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconAt,
  IconBrandDiscord,
  IconBrandTwitch,
  IconCopy,
  IconExternalLink,
  IconLock,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"

import { api } from "@workspace/backend/convex/_generated/api"
import type { Doc, Id } from "@workspace/backend/convex/_generated/dataModel"
import type { RankValue } from "@workspace/backend/lib/playingWithViewers"
import { AppSelect } from "@/components/AppSelect"
import {
  type AvailableDiscordGuild,
  type QueueChannelBotPermissionStatus,
} from "@/features/creator-tools/play-with-viewers/lib/play-with-viewers-api"
import {
  useClearQueueAction,
  useCreateQueueInOwnedGuildAction,
  useFixQueueChannelPermissionsAction,
  useInviteQueueEntryNowAndNotifyAction,
  useListAvailableDiscordGuildsAction,
  usePublishQueueMessageAction,
  useRemoveQueueEntryAction,
  useSelectNextBatchAndNotifyAction,
  useSetQueueActiveAction,
  useSyncQueueDiscordContextAction,
  useUpdateQueueMessageAction,
  useUpdateQueueSettingsAction,
} from "@/features/creator-tools/play-with-viewers/lib/play-with-viewers-client"
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
  AvatarImage,
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
type QueueRoundUser = ViewerQueueRound["selectedUsers"][number]

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

type SelectionResultState =
  | {
      createdAt: number
      inviteMode: InviteMode
      lobbyCode?: string
      selectionKind: "batch" | "entry"
      selectedUsers: QueueRoundUser[]
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

const playersPerBatchOptions = Array.from({ length: 30 }, (_, index) => index + 1)
const matchesPerViewerOptions = Array.from(
  { length: 10 },
  (_, index) => index + 1
)
const rankOrder = new Map(rankOptions.map((option, index) => [option.value, index]))
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
})
const defaultCreatorMessage =
  "Welcome to Play With Viewers. Jump into the queue if you want a shot at joining me in the next lobby."
const defaultRulesText = [
  "- Show respect to everyone in the lobby.",
  "- Be sportsmanlike and keep comms constructive.",
  "- No harassment, hate speech, or griefing.",
  "- Be ready when your turn comes up so the queue can keep moving.",
].join("\n")
const DISCORD_BOT_REINVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1474892349133029539"

function getDefaultQueueFormState(name: string): QueueFormState {
  const trimmedName = name.trim()
  const resolvedName = trimmedName || "Creator"

  return {
    channelId: "",
    creatorDisplayName: resolvedName,
    creatorMessage: defaultCreatorMessage,
    gameLabel: "Call of Duty: Black Ops 7",
    guildId: "",
    inviteMode: "discord_dm",
    matchesPerViewer: "1",
    maxRank: "top250",
    minRank: "bronze",
    playersPerBatch: "3",
    rulesText: defaultRulesText,
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
      .replace(/^\[CONVEX [^\]]+\]\s*/u, "")
      .replace(/^Uncaught Error:\s*/u, "")
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

function formatDiscordContext(
  queue: ViewerQueue | null,
  isResolvingContext: boolean = false
) {
  if (!queue) {
    return "Discord channel not configured"
  }

  const guildName = queue.guildName?.trim()
  const channelName = queue.channelName?.trim()

  if (guildName && channelName) {
    return `${guildName} / #${channelName}`
  }

  if (guildName) {
    return guildName
  }

  if (channelName) {
    return `#${channelName}`
  }

  return isResolvingContext
    ? "Resolving Discord server and channel..."
    : "Discord target configured"
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
        "overflow-hidden rounded-xl border border-border/60 bg-background",
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
    <div className="flex shrink-0 items-center gap-3">
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      className="hidden h-5 w-px bg-border/60 lg:block"
    />
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

      <Panel>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </Panel>
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

function SelectionResultSummary({
  onCopyMentions,
  onCopyUsernames,
  selectionResult,
}: Readonly<{
  onCopyMentions: () => Promise<void>
  onCopyUsernames: () => Promise<void>
  selectionResult: SelectionResultState
}>) {
  if (!selectionResult) {
    return null
  }

  const hasDmStatuses = selectionResult.selectedUsers.some(
    (user) => user.dmStatus !== undefined
  )
  const failedDmCount = selectionResult.selectedUsers.filter(
    (user) => user.dmStatus === "failed"
  ).length

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
        <Badge variant="secondary">
          {getInviteModeLabel(selectionResult.inviteMode)}
        </Badge>
        <Badge variant="outline">
          {selectionResult.selectedUsers.length} selected
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(selectionResult.createdAt)}
        </span>
        {selectionResult.lobbyCode ? (
          <span className="rounded-md border border-border/70 bg-background px-2 py-1 font-mono text-xs text-foreground">
            Lobby {selectionResult.lobbyCode}
          </span>
        ) : null}
      </div>

      {selectionResult.inviteMode === "discord_dm" && failedDmCount > 0 ? (
        <div className="border-b border-border/70 px-4 py-3">
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>Manual follow-up needed</AlertTitle>
            <AlertDescription>
              {failedDmCount} viewer{failedDmCount === 1 ? "" : "s"} could not be
              reached by Discord DM. Ask them to enable DMs or contact them
              manually.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {selectionResult.inviteMode === "manual_creator_contact" ? (
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

      <div className="flex max-h-[420px] flex-col divide-y divide-border/70 overflow-y-auto">
        {selectionResult.selectedUsers.map((user) => (
          <div
            key={`${selectionResult.createdAt}-${user.discordUserId}`}
            className="flex flex-col gap-3 px-4 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9">
                  <AvatarImage alt={user.displayName} src={user.avatarUrl} />
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {user.displayName}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    @{user.username}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline">{getRankLabel(user.rank)}</Badge>
                {hasDmStatuses && user.dmStatus ? (
                  <Badge
                    variant={
                      user.dmStatus === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {user.dmStatus === "failed" ? "DM failed" : "DM sent"}
                  </Badge>
                ) : null}
              </div>
            </div>

            {user.dmFailureReason ? (
              <p className="text-sm text-muted-foreground">{user.dmFailureReason}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

type PlayWithViewersDashboardViewProps = {
  hasTwitchLinked: boolean
  preferredCreatorDisplayName: string
}

export function PlayWithViewersDashboardView({
  hasTwitchLinked,
  preferredCreatorDisplayName,
}: PlayWithViewersDashboardViewProps) {
  const currentUser = useQuery(api.queries.users.current)
  const queue = useQuery(
    api.queries.creatorTools.playingWithViewers.queue.getCurrentCreatorQueue,
    currentUser ? {} : "skip"
  ) as ViewerQueue | null | undefined
  const queueEntries = useQuery(
    api.queries.creatorTools.playingWithViewers.queue.getCurrentCreatorQueueEntries,
    queue?._id ? { queueId: queue._id } : "skip"
  ) as ViewerQueueEntry[] | undefined

  const clearQueue = useClearQueueAction()
  const createQueueInOwnedGuild = useCreateQueueInOwnedGuildAction()
  const fixQueueChannelPermissions = useFixQueueChannelPermissionsAction()
  const inviteQueueEntryNowAndNotify = useInviteQueueEntryNowAndNotifyAction()
  const listAvailableDiscordGuilds = useListAvailableDiscordGuildsAction()
  const publishQueueMessage = usePublishQueueMessageAction()
  const removeQueueEntry = useRemoveQueueEntryAction()
  const refreshQueueMessage = useUpdateQueueMessageAction()
  const selectNextBatchAndNotify = useSelectNextBatchAndNotifyAction()
  const setQueueActive = useSetQueueActiveAction()
  const syncQueueDiscordContext = useSyncQueueDiscordContextAction()
  const updateQueueSettings = useUpdateQueueSettingsAction()

  const [now, setNow] = useState(() => Date.now())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectionDialogState, setSelectionDialogState] =
    useState<SelectionDialogState>(null)
  const [selectionResultState, setSelectionResultState] =
    useState<SelectionResultState>(null)
  const [selectionLobbyCode, setSelectionLobbyCode] = useState("")
  const [createFormState, setCreateFormState] = useState<QueueFormState>(() =>
    getDefaultQueueFormState(preferredCreatorDisplayName)
  )
  const [settingsFormState, setSettingsFormState] = useState<QueueFormState>(
    () => getDefaultQueueFormState(preferredCreatorDisplayName)
  )
  const [isCreatingQueue, setIsCreatingQueue] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingQueue, setIsClearingQueue] = useState(false)
  const [isSelectingBatch, setIsSelectingBatch] = useState(false)
  const [isSyncingDiscordContext, setIsSyncingDiscordContext] = useState(false)
  const [isFixingChannelPermissions, setIsFixingChannelPermissions] =
    useState(false)
  const [isLoadingAvailableGuilds, setIsLoadingAvailableGuilds] = useState(false)
  const [toolbarFieldPending, setToolbarFieldPending] = useState<string | null>(
    null
  )
  const [availableGuilds, setAvailableGuilds] = useState<AvailableDiscordGuild[]>(
    []
  )
  const [availableGuildsError, setAvailableGuildsError] = useState<string | null>(
    null
  )
  const [removingEntryId, setRemovingEntryId] =
    useState<Id<"viewerQueueEntries"> | null>(null)
  const [auditedQueueId, setAuditedQueueId] = useState<Id<"viewerQueues"> | null>(
    null
  )
  const [auditedChannelPermsCorrect, setAuditedChannelPermsCorrect] = useState<
    boolean | null
  >(null)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [permissionsDialogQueueId, setPermissionsDialogQueueId] =
    useState<Id<"viewerQueues"> | null>(null)
  const [queueBotPermissionStatus, setQueueBotPermissionStatus] =
    useState<QueueChannelBotPermissionStatus | null>(null)
  const hasAuditedQueuePermissions = Boolean(
    queue && auditedQueueId === queue._id
  )
  const resolvedChannelPermsCorrect =
    queue?.channelPermsCorrect === true
      ? true
      : hasAuditedQueuePermissions && auditedChannelPermsCorrect !== null
      ? auditedChannelPermsCorrect
      : (queue?.channelPermsCorrect ?? null)

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
    if (queue === undefined || queue !== null) {
      return
    }

    setCreateFormState(getDefaultQueueFormState(preferredCreatorDisplayName))
  }, [preferredCreatorDisplayName, queue])

  useEffect(() => {
    if (!settingsOpen || queue !== null) {
      return
    }

    let cancelled = false

    async function loadAvailableGuilds() {
      setIsLoadingAvailableGuilds(true)
      setAvailableGuildsError(null)

      try {
        const guilds: AvailableDiscordGuild[] = await listAvailableDiscordGuilds({})

        if (cancelled) {
          return
        }

        setAvailableGuilds(guilds)
        setCreateFormState((current) => ({
          ...current,
          guildId: guilds.some((guild) => guild.id === current.guildId)
            ? current.guildId
            : (guilds[0]?.id ?? ""),
        }))
      } catch (error) {
        if (cancelled) {
          return
        }

        setAvailableGuilds([])
        setAvailableGuildsError(
          toErrorMessage(error, "Unable to load eligible Discord servers.")
        )
        setCreateFormState((current) => ({
          ...current,
          guildId: "",
        }))
      } finally {
        if (!cancelled) {
          setIsLoadingAvailableGuilds(false)
        }
      }
    }

    void loadAvailableGuilds()

    return () => {
      cancelled = true
    }
  }, [listAvailableDiscordGuilds, queue, settingsOpen])

  useEffect(() => {
    if (!queue || settingsOpen) {
      return
    }

    setSettingsFormState(toQueueFormState(queue))
  }, [queue, settingsOpen])

  useEffect(() => {
    setAuditedQueueId(null)
    setAuditedChannelPermsCorrect(null)
    setPermissionsDialogOpen(false)
    setPermissionsDialogQueueId(null)
    setQueueBotPermissionStatus(null)
  }, [queue?._id])

  useEffect(() => {
    if (!queue || auditedQueueId === queue._id) {
      return
    }

    if (queue.channelPermsCorrect === true) {
      setAuditedChannelPermsCorrect(true)
      setAuditedQueueId(queue._id)
      setQueueBotPermissionStatus(null)
      setIsSyncingDiscordContext(false)
      return
    }

    const queueId = queue._id
    let cancelled = false

    async function resolveDiscordContext() {
      setIsSyncingDiscordContext(true)

      try {
        const result = await syncQueueDiscordContext({
          queueId,
        })

        if (cancelled) {
          return
        }

        setAuditedChannelPermsCorrect(result.channelPermsCorrect)
        setQueueBotPermissionStatus(result.botPermissionStatus)
      } catch {
        // Keep the dashboard usable even if the Discord audit fails.
      } finally {
        if (!cancelled) {
          setAuditedQueueId(queueId)
          setIsSyncingDiscordContext(false)
        }
      }
    }

    void resolveDiscordContext()

    return () => {
      cancelled = true
    }
  }, [auditedQueueId, queue, syncQueueDiscordContext])

  useEffect(() => {
    if (!queue || auditedQueueId !== queue._id || isSyncingDiscordContext) {
      return
    }

    if (resolvedChannelPermsCorrect === true) {
      setPermissionsDialogOpen(false)
      setPermissionsDialogQueueId(null)
      return
    }

    if (permissionsDialogQueueId !== queue._id) {
      setPermissionsDialogOpen(true)
      setPermissionsDialogQueueId(queue._id)
    }
  }, [
    auditedQueueId,
    isSyncingDiscordContext,
    permissionsDialogQueueId,
    queue,
    resolvedChannelPermsCorrect,
  ])

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
    (queue !== null && queue !== undefined && queueEntries === undefined)

  function applyAuditedDiscordContext(
    queueId: Id<"viewerQueues">,
    result: Awaited<ReturnType<typeof syncQueueDiscordContext>>
  ) {
    setAuditedQueueId(queueId)
    setAuditedChannelPermsCorrect(result.channelPermsCorrect)
    setQueueBotPermissionStatus(result.botPermissionStatus)

    if (result.botPermissionStatus?.needsReinvite || result.channelPermsCorrect !== true) {
      setPermissionsDialogOpen(true)
      setPermissionsDialogQueueId(queueId)
      return
    }

    setPermissionsDialogOpen(false)
    setPermissionsDialogQueueId(null)
  }

  async function ensureQueueReadyForDiscordSync(queueId: Id<"viewerQueues">) {
    setIsSyncingDiscordContext(true)

    try {
      const result = await syncQueueDiscordContext({
        queueId,
      })

      applyAuditedDiscordContext(queueId, result)

      if (result.botPermissionStatus?.needsReinvite) {
        toast.error(
          "Reinvite the Discord bot with the required server permissions before publishing or refreshing this queue."
        )
        return false
      }

      if (result.channelPermsCorrect !== true) {
        toast.error(
          "Fix the Play With Viewers channel permissions before publishing or refreshing the queue message."
        )
        return false
      }

      return true
    } catch (error) {
      toast.error(
        toErrorMessage(error, "Unable to verify the Discord queue right now.")
      )
      return false
    } finally {
      setIsSyncingDiscordContext(false)
    }
  }

  async function syncQueueMessageIfPublished(queueId: Id<"viewerQueues">) {
    if (!queue?.messageId) {
      return
    }

    const canRefreshQueueMessage = await ensureQueueReadyForDiscordSync(queueId)

    if (!canRefreshQueueMessage) {
      return
    }

    try {
      await refreshQueueMessage({ queueId })
    } catch {
      toast.error(
        "The queue changed, but the Discord message refresh failed. Check the sync error banner."
      )
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
    if (!selectionResultState) {
      return
    }

    await handleCopyToClipboard(
      selectionResultState.selectedUsers
        .map((user) => `<@${user.discordUserId}>`)
        .join("\n"),
      "Mentions copied."
    )
  }

  async function handleCopyUsernames() {
    if (!selectionResultState) {
      return
    }

    await handleCopyToClipboard(
      selectionResultState.selectedUsers.map((user) => user.username).join("\n"),
      "Usernames copied."
    )
  }

  async function handleCreateQueue() {
    if (!createFormState.guildId.trim()) {
      toast.error("Select a Discord server before creating the queue.")
      return
    }

    const normalizedRanks = normalizeRankBounds(
      createFormState.minRank,
      createFormState.maxRank
    )

    setIsCreatingQueue(true)

    try {
      const result = await createQueueInOwnedGuild({
        creatorDisplayName: createFormState.creatorDisplayName.trim(),
        creatorMessage: createFormState.creatorMessage.trim() || undefined,
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

      setSettingsOpen(false)

      if (result.messagePublished) {
        toast.success(
          `Queue created in #${result.channelName} and published to Discord.`
        )
      } else {
        toast.error(
          result.publishError ??
            "Queue created, but the initial Discord publish failed."
        )
      }
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
      const canPublishQueueMessage = await ensureQueueReadyForDiscordSync(queue._id)

      if (!canPublishQueueMessage) {
        return
      }

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
      const canRefreshQueueMessage = await ensureQueueReadyForDiscordSync(queue._id)

      if (!canRefreshQueueMessage) {
        return
      }

      await refreshQueueMessage({ queueId: queue._id })
      toast.success("Queue message refreshed.")
    } catch (error) {
      toast.error(toErrorMessage(error, "Unable to refresh queue message."))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleFixChannelPermissions() {
    if (!queue) {
      return
    }

    setIsFixingChannelPermissions(true)

    try {
      const result = await fixQueueChannelPermissions({
        queueId: queue._id,
      })

      setAuditedQueueId(queue._id)
      setAuditedChannelPermsCorrect(result.channelPermsCorrect)
      setQueueBotPermissionStatus(result.botPermissionStatus)

      if (!result.permissionsUpdated) {
        setPermissionsDialogOpen(true)
        setPermissionsDialogQueueId(queue._id)
        return
      }

      setPermissionsDialogOpen(false)
      setPermissionsDialogQueueId(null)
      toast.success("Discord channel permissions updated.")
    } catch (error) {
      toast.error(
        toErrorMessage(error, "Unable to repair Discord channel permissions.")
      )
    } finally {
      setIsFixingChannelPermissions(false)
    }
  }

  async function handleRetryQueueMessageSync() {
    if (!queue) {
      return
    }

    if (queue.messageId) {
      await handleRefreshQueueMessage()
      return
    }

    await handlePublishQueueMessage()
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
      const selectionKind =
        selectionDialogState?.kind === "entry" ? "entry" : "batch"
      const result =
        selectionDialogState?.kind === "entry"
          ? await inviteQueueEntryNowAndNotify({
              entryId: selectionDialogState.entryId,
              lobbyCode,
            })
          : await selectNextBatchAndNotify({
              lobbyCode,
              queueId: queue._id,
            })

      const failedDmCount = result.selectedUsers.filter(
        (user: QueueRoundUser) => user.dmStatus === "failed"
      ).length

      setSelectionResultState({
        createdAt: Date.now(),
        inviteMode: queue.inviteMode,
        lobbyCode,
        selectedUsers: result.selectedUsers as QueueRoundUser[],
        selectionKind,
      })

      if (selectionDialogState?.kind === "entry") {
        if (queue.inviteMode === "discord_dm") {
          if (failedDmCount > 0) {
            toast.error(
              `Invite attempted. ${failedDmCount} Discord DM${failedDmCount === 1 ? "" : "s"} failed.`
            )
          } else {
            toast.success(
              `${selectionDialogState.displayName} was invited by Discord DM.`
            )
          }
        } else {
          toast.success(
            `${selectionDialogState.displayName} is ready for manual invite.`
          )
        }
      } else {
        if (queue.inviteMode === "discord_dm") {
          if (failedDmCount > 0) {
            toast.error(
              `Batch processed. ${failedDmCount} Discord DM${failedDmCount === 1 ? "" : "s"} failed.`
            )
          } else {
            toast.success(
              `Invited ${result.selectedCount} viewer${result.selectedCount === 1 ? "" : "s"} by Discord DM.`
            )
          }
        } else {
          toast.success(
            `Selected ${result.selectedCount} viewer${result.selectedCount === 1 ? "" : "s"} for manual invite.`
          )
        }
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
  const hasDiscordSyncError = Boolean(queue?.lastMessageSyncError)
  const hasPublishedMessage = Boolean(queue?.messageId)
  const isRetryingDiscordSync = hasPublishedMessage ? isRefreshing : isPublishing
  const discordContextLabel = formatDiscordContext(
    queue ?? null,
    isSyncingDiscordContext
  )
  const needsChannelPermissionRepair = Boolean(
    queue &&
      hasAuditedQueuePermissions &&
      resolvedChannelPermsCorrect !== true
  )
  const permissionsDialogNeedsReinvite = Boolean(
    needsChannelPermissionRepair && queueBotPermissionStatus?.needsReinvite
  )
  const missingBotPermissionLabels = queueBotPermissionStatus?.missingPermissionLabels ?? []
  const retryDiscordSyncLabel = hasPublishedMessage
    ? isRefreshing
      ? "Retrying..."
      : "Retry refresh"
    : isPublishing
      ? "Retrying..."
      : "Retry publish"
  const selectionResultTitle = !selectionResultState
    ? "Selection results"
    : selectionResultState.inviteMode === "discord_dm"
      ? selectionResultState.selectionKind === "entry"
        ? "Discord invite result"
        : "Batch invite results"
      : selectionResultState.selectionKind === "entry"
        ? "Viewer ready to invite"
        : "Batch ready to invite"
  const selectionResultDescription =
    selectionResultState?.inviteMode === "discord_dm"
      ? "Review the Discord DM results for the selected viewers."
      : "Use this list to contact the selected viewers directly."

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
            {discordContextLabel}
          </span>
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
          <AlertDescription className="flex flex-wrap items-start justify-between gap-3">
            <span className="min-w-0 flex-1">{queue.lastMessageSyncError}</span>
            <Button
              disabled={isRetryingDiscordSync}
              onClick={handleRetryQueueMessageSync}
              size="sm"
              variant="outline"
            >
              <IconRefresh data-icon="inline-start" />
              {retryDiscordSyncLabel}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {needsChannelPermissionRepair ? (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>
            {permissionsDialogNeedsReinvite
              ? "Discord bot permissions need updating"
              : "Discord channel permissions need repair"}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-start justify-between gap-3">
            <span className="min-w-0 flex-1">
              {permissionsDialogNeedsReinvite
                ? "The bot cannot update the Play With Viewers channel overwrites in this server yet. Reinvite it with the updated Discord permissions, then run the repair again."
                : "The Play With Viewers channel needs its private overwrite set reapplied before viewers should use it."}
            </span>
            <Button
              onClick={() => setPermissionsDialogOpen(true)}
              size="sm"
              variant="outline"
            >
              <IconSettings data-icon="inline-start" />
              {permissionsDialogNeedsReinvite ? "Reinvite bot" : "Fix permissions"}
            </Button>
          </AlertDescription>
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
                Create the first Play With Viewers queue, choose a Discord
                server you own where the bot is already installed, and the app
                will create or reuse #play-with-viewers automatically.
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
            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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

                <ToolbarDivider />

                <ToolbarGroup label="Ranks">
                  <AppSelect
                    className="w-[144px] max-w-full"
                    disabled={toolbarFieldPending !== null}
                    onValueChange={(value) =>
                      handleToolbarSettingsChange("minRank", {
                        minRank: value as RankValue,
                      })
                    }
                    options={rankOptions.map((option) => ({
                      label: `Min ${option.label}`,
                      value: option.value,
                    }))}
                    size="sm"
                    value={queue.minRank}
                  />
                  <AppSelect
                    className="w-[144px] max-w-full"
                    disabled={toolbarFieldPending !== null}
                    onValueChange={(value) =>
                      handleToolbarSettingsChange("maxRank", {
                        maxRank: value as RankValue,
                      })
                    }
                    options={rankOptions.map((option) => ({
                      label: `Max ${option.label}`,
                      value: option.value,
                    }))}
                    size="sm"
                    value={queue.maxRank}
                  />
                </ToolbarGroup>

                <ToolbarDivider />

                <ToolbarGroup label="Batch">
                  <AppSelect
                    className="w-[148px] max-w-full"
                    disabled={toolbarFieldPending !== null}
                    onValueChange={(value) =>
                      handleToolbarSettingsChange("playersPerBatch", {
                        playersPerBatch: Number(value),
                      })
                    }
                    options={playersPerBatchOptions.map((value) => ({
                      label: `${value} per batch`,
                      value: String(value),
                    }))}
                    size="sm"
                    value={String(queue.playersPerBatch)}
                  />
                  <AppSelect
                    className="w-[124px] max-w-full"
                    disabled={toolbarFieldPending !== null}
                    onValueChange={(value) =>
                      handleToolbarSettingsChange("matchesPerViewer", {
                        matchesPerViewer: Number(value),
                      })
                    }
                    options={matchesPerViewerOptions.map((value) => ({
                      label: `${value} match${value === 1 ? "" : "es"}`,
                      value: String(value),
                    }))}
                    size="sm"
                    value={String(queue.matchesPerViewer)}
                  />
                </ToolbarGroup>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/50 pt-4">
                <ToolbarGroup label="Invite mode">
                  <AppSelect
                    className="w-[168px] max-w-full"
                    disabled={toolbarFieldPending !== null}
                    onValueChange={(value) =>
                      handleToolbarSettingsChange("inviteMode", {
                        inviteMode: value as InviteMode,
                      })
                    }
                    options={inviteModeOptions.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    size="sm"
                    value={queue.inviteMode}
                  />
                </ToolbarGroup>

                <ToolbarDivider />

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    onClick={() => setSettingsOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <IconSettings data-icon="inline-start" />
                    Settings
                  </Button>
                  <Button
                    disabled={hasPublishedMessage || isPublishing}
                    onClick={handlePublishQueueMessage}
                    size="sm"
                    variant="outline"
                  >
                    <IconBrandDiscord data-icon="inline-start" />
                    {isPublishing
                      ? "Publishing..."
                      : hasDiscordSyncError
                        ? "Retry publish"
                        : "Publish"}
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
                          This removes every waiting viewer from the active list.
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
            </div>
          </Panel>
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
              <Badge variant="outline">{queue.playersPerBatch} per batch</Badge>
            </div>

            {entries.length === 0 ? (
              <Empty className="min-h-[360px] rounded-none border-0 p-6">
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
              <ScrollArea className="max-h-[700px]">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20 px-4">Position</TableHead>
                      <TableHead className="min-w-[320px] px-4">Viewer</TableHead>
                      <TableHead className="w-36 px-4">Rank</TableHead>
                      <TableHead className="w-48 px-4">Joined</TableHead>
                      <TableHead className="w-32 px-4">Waiting</TableHead>
                      <TableHead className="w-[220px] px-4 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={entry._id}>
                        <TableCell className="px-4 py-4 font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="size-10">
                              <AvatarImage
                                alt={entry.displayName}
                                src={entry.avatarUrl}
                              />
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
                        <TableCell className="px-4 py-4">
                          <Badge variant="outline">
                            {getRankLabel(entry.rank)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-muted-foreground">
                          {formatDateTime(entry.joinedAt)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-muted-foreground">
                          {formatWaitDuration(entry.joinedAt, now)}
                        </TableCell>
                        <TableCell className="px-4 py-4">
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
        </>
      ) : null}

      <Sheet onOpenChange={setSettingsOpen} open={settingsOpen}>
        <SheetContent className="w-full p-0 sm:max-w-2xl lg:max-w-[54rem]">
          <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-5 text-left">
            <SheetTitle>
              {queue ? "Queue settings" : "Create Play With Viewers queue"}
            </SheetTitle>
            <SheetDescription>
              {queue
                ? "Edit the operational queue configuration without leaving the dashboard."
                : "Configure the queue, choose an eligible Discord server, and create the creator control surface."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-6">
              <FieldGroup>
                <div className="grid gap-6">
                {!queue ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor="pwv-guild-id">Discord server</FieldLabel>
                      <AppSelect
                        disabled={
                          isLoadingAvailableGuilds ||
                          Boolean(availableGuildsError) ||
                          availableGuilds.length === 0
                        }
                        id="pwv-guild-id"
                        onValueChange={(value) =>
                          setCreateFormState((current) => ({
                            ...current,
                            guildId: value,
                          }))
                        }
                        options={availableGuilds.map((guild) => ({
                          label: guild.name,
                          value: guild.id,
                        }))}
                        placeholder="Select a Discord server"
                        value={createFormState.guildId}
                      />
                      <FieldDescription>
                        {isLoadingAvailableGuilds
                          ? "Checking the Discord servers you own where the bot is already installed."
                          : availableGuildsError
                            ? availableGuildsError
                            : availableGuilds.length === 0
                              ? "No eligible servers are available yet."
                              : "The app will reuse #play-with-viewers if it already exists. Otherwise it creates the channel and publishes the queue immediately."}
                      </FieldDescription>
                    </Field>

                    {availableGuilds.length === 0 &&
                    !isLoadingAvailableGuilds &&
                    !availableGuildsError ? (
                      <Alert>
                        <IconBrandDiscord />
                        <AlertTitle>No eligible Discord servers</AlertTitle>
                        <AlertDescription className="flex flex-col gap-3">
                          <p>
                            Play With Viewers only lists servers you own where
                            the bot is already present.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={DISCORD_BOT_REINVITE_URL}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <IconExternalLink data-icon="inline-start" />
                                Add bot to a server
                              </a>
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}
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
                    className="min-h-[120px] resize-y"
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
                    className="min-h-[140px] resize-y"
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

                <Field>
                  <FieldLabel htmlFor="pwv-players-per-batch">
                    Players per batch
                  </FieldLabel>
                  <AppSelect
                    id="pwv-players-per-batch"
                    onValueChange={(value) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            playersPerBatch: value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            playersPerBatch: value,
                          }))
                    }
                    options={playersPerBatchOptions.map((value) => ({
                      label: String(value),
                      value: String(value),
                    }))}
                    value={
                      queue
                        ? settingsFormState.playersPerBatch
                        : createFormState.playersPerBatch
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-matches-per-viewer">
                    Matches per viewer
                  </FieldLabel>
                  <AppSelect
                    id="pwv-matches-per-viewer"
                    onValueChange={(value) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            matchesPerViewer: value,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            matchesPerViewer: value,
                          }))
                    }
                    options={matchesPerViewerOptions.map((value) => ({
                      label: String(value),
                      value: String(value),
                    }))}
                    value={
                      queue
                        ? settingsFormState.matchesPerViewer
                        : createFormState.matchesPerViewer
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-min-rank">Minimum rank</FieldLabel>
                  <AppSelect
                    id="pwv-min-rank"
                    onValueChange={(value) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            minRank: value as RankValue,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            minRank: value as RankValue,
                          }))
                    }
                    options={rankOptions.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    value={queue ? settingsFormState.minRank : createFormState.minRank}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-max-rank">Maximum rank</FieldLabel>
                  <AppSelect
                    id="pwv-max-rank"
                    onValueChange={(value) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            maxRank: value as RankValue,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            maxRank: value as RankValue,
                          }))
                    }
                    options={rankOptions.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    value={queue ? settingsFormState.maxRank : createFormState.maxRank}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="pwv-invite-mode">Invite mode</FieldLabel>
                  <AppSelect
                    id="pwv-invite-mode"
                    onValueChange={(value) =>
                      queue
                        ? setSettingsFormState((current) => ({
                            ...current,
                            inviteMode: value as InviteMode,
                          }))
                        : setCreateFormState((current) => ({
                            ...current,
                            inviteMode: value as InviteMode,
                          }))
                    }
                    options={inviteModeOptions.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    value={queue ? settingsFormState.inviteMode : createFormState.inviteMode}
                  />
                  <FieldDescription>
                    {queue
                      ? `Discord target stays fixed on ${discordContextLabel}.`
                      : "Discord DM mode requires a lobby code when selecting viewers."}
                  </FieldDescription>
                </Field>
                </div>
              </FieldGroup>
            </div>
          </ScrollArea>

          <SheetFooter className="shrink-0 border-t border-border/60 px-6 py-4">
            <Button onClick={() => setSettingsOpen(false)} size="sm" variant="outline">
              Cancel
            </Button>
            {queue ? (
              <Button disabled={isSavingSettings} onClick={handleSaveSettings} size="sm">
                {isSavingSettings ? "Saving..." : "Save settings"}
              </Button>
            ) : (
              <Button
                disabled={
                  isCreatingQueue ||
                  isLoadingAvailableGuilds ||
                  availableGuilds.length === 0 ||
                  !createFormState.guildId.trim()
                }
                onClick={handleCreateQueue}
                size="sm"
              >
                {isCreatingQueue ? "Creating..." : "Create queue"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        onOpenChange={setPermissionsDialogOpen}
        open={permissionsDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {permissionsDialogNeedsReinvite
                ? "Update Discord bot permissions"
                : "Fix Discord channel permissions"}
            </DialogTitle>
            <DialogDescription>
              {permissionsDialogNeedsReinvite
                ? queueBotPermissionStatus?.missingManageRoles
                  ? 'Discord is blocking channel overwrite updates because the bot is missing the "Manage Roles" permission in this server.'
                  : "Discord is blocking channel overwrite updates because the bot is missing required server permissions for the Play With Viewers channel."
                : "Play With Viewers needs a locked-down channel so only viewers can see the queue and interact with the bot controls."}
            </DialogDescription>
          </DialogHeader>

          {permissionsDialogNeedsReinvite ? (
            <FieldGroup>
              <Field>
                <FieldLabel>Missing in this server</FieldLabel>
                <FieldDescription>
                  {missingBotPermissionLabels.length > 0
                    ? missingBotPermissionLabels.join(", ")
                    : "The current bot invite is missing one or more required permissions."}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>What to do</FieldLabel>
                <FieldDescription>
                  Reinvite the bot so Discord grants the updated permission set,
                  then come back here and check again.
                </FieldDescription>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel>Everyone</FieldLabel>
                <FieldDescription>
                  Keep only view channel, read message history, and use
                  application commands enabled.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Bot</FieldLabel>
                <FieldDescription>
                  Allow message sending, message management, embeds, files,
                  reactions, external emoji and stickers, pinning, slow mode
                  bypass, polls, and external apps.
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}

          <DialogFooter>
            <Button onClick={() => setPermissionsDialogOpen(false)} variant="outline">
              Not now
            </Button>
            {permissionsDialogNeedsReinvite ? (
              <>
                <Button asChild variant="outline">
                  <a href={DISCORD_BOT_REINVITE_URL} rel="noreferrer" target="_blank">
                    <IconExternalLink data-icon="inline-start" />
                    Reinvite bot
                  </a>
                </Button>
                <Button
                  disabled={!queue || isFixingChannelPermissions}
                  onClick={handleFixChannelPermissions}
                >
                  {isFixingChannelPermissions ? "Checking..." : "Check again"}
                </Button>
              </>
            ) : (
              <Button
                disabled={!queue || isFixingChannelPermissions}
                onClick={handleFixChannelPermissions}
              >
                {isFixingChannelPermissions ? "Fixing..." : "Fix permissions"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                ? "This immediately pulls one waiting viewer out of the queue."
                : "This runs the next batch flow and opens a follow-up result dialog for the selected viewers."}
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
                  The selected viewers will open in a follow-up dialog with
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

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectionResultState(null)
          }
        }}
        open={selectionResultState !== null}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectionResultTitle}</DialogTitle>
            <DialogDescription>{selectionResultDescription}</DialogDescription>
          </DialogHeader>

          <SelectionResultSummary
            onCopyMentions={handleCopyMentions}
            onCopyUsernames={handleCopyUsernames}
            selectionResult={selectionResultState}
          />

          <DialogFooter>
            <Button onClick={() => setSelectionResultState(null)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
