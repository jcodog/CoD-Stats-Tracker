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
