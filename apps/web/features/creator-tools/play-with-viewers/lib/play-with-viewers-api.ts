export const PLAY_WITH_VIEWERS_CSRF_HEADER = "x-codstats-csrf"
export const PLAY_WITH_VIEWERS_CSRF_HEADER_VALUE = "1"

export const playWithViewersApiActions = [
  "clearQueue",
  "createQueueInOwnedGuild",
  "fixQueueChannelPermissions",
  "inviteQueueEntryNowAndNotify",
  "listAvailableDiscordGuilds",
  "publishQueueMessage",
  "removeQueueEntry",
  "selectNextBatchAndNotify",
  "setQueueActive",
  "syncQueueDiscordContext",
  "updateQueueMessage",
  "updateQueueSettings",
] as const

export type PlayWithViewersApiAction =
  (typeof playWithViewersApiActions)[number]

export type AvailableDiscordGuild = {
  iconUrl: string | null
  id: string
  name: string
}

export type QueueChannelBotPermissionStatus = {
  canUpdateChannelPermissions: boolean
  missingManagePermissionLabels: string[]
  missingManageRoles: boolean
  missingOverwritePermissionLabels: string[]
  missingPermissionLabels: string[]
  needsReinvite: boolean
}

export type QueueDiscordContext = {
  botPermissionStatus: QueueChannelBotPermissionStatus
  channelName: string
  channelPermsCorrect: boolean
  guildName: string
}

export type QueueChannelPermissionsFixResult = QueueDiscordContext & {
  permissionsUpdated: boolean
}
