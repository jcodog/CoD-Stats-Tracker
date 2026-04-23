import { playWithViewersConfig as backendPlayWithViewersConfig } from "@workspace/backend/lib/creatorToolsConfig"

export const playWithViewersConfig = {
  twitchDisabled: backendPlayWithViewersConfig.twitchDisabled,
  twitchEnabled: !backendPlayWithViewersConfig.twitchDisabled,
} as const
