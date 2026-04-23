export const playWithViewersConfig = {
  twitchDisabled: true,
} as const

export type PlayWithViewersStoredTwitchContextLike = {
  twitchBotAnnouncementsEnabled?: boolean
  twitchBroadcasterId?: string
  twitchBroadcasterLogin?: string
  twitchCommandsEnabled?: boolean
}

export type PlayWithViewersStoredTwitchContext = {
  twitchBotAnnouncementsEnabled: boolean
  twitchBroadcasterId: string
  twitchBroadcasterLogin: string
  twitchCommandsEnabled: boolean
}

const DISABLED_PLAY_WITH_VIEWERS_TWITCH_CONTEXT: PlayWithViewersStoredTwitchContext =
  {
    twitchBotAnnouncementsEnabled: false,
    twitchBroadcasterId: "",
    twitchBroadcasterLogin: "",
    twitchCommandsEnabled: false,
  }

export function isPlayWithViewersTwitchEnabled() {
  return !playWithViewersConfig.twitchDisabled
}

export function getDisabledPlayWithViewersTwitchContext(): PlayWithViewersStoredTwitchContext {
  return {
    ...DISABLED_PLAY_WITH_VIEWERS_TWITCH_CONTEXT,
  }
}

export function normalizePlayWithViewersTwitchContext(
  context?: PlayWithViewersStoredTwitchContextLike | null
): PlayWithViewersStoredTwitchContext {
  return {
    twitchBotAnnouncementsEnabled:
      context?.twitchBotAnnouncementsEnabled ?? false,
    twitchBroadcasterId: context?.twitchBroadcasterId?.trim() ?? "",
    twitchBroadcasterLogin: context?.twitchBroadcasterLogin?.trim() ?? "",
    twitchCommandsEnabled: context?.twitchCommandsEnabled ?? false,
  }
}

export function hasEnabledPlayWithViewersTwitchContext(
  context?: PlayWithViewersStoredTwitchContextLike | null
) {
  const normalizedContext = normalizePlayWithViewersTwitchContext(context)

  return (
    normalizedContext.twitchCommandsEnabled &&
    normalizedContext.twitchBroadcasterId.length > 0 &&
    normalizedContext.twitchBroadcasterLogin.length > 0
  )
}
