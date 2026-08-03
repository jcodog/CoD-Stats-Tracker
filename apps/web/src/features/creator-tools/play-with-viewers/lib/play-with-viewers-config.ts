import { playWithViewersConfig as backendPlayWithViewersConfig } from "@workspace/backend/lib/creator-tools/play-with-viewers/config"

export const playWithViewersConfig = {
  twitchDisabled: backendPlayWithViewersConfig.twitchDisabled,
  twitchEnabled: !backendPlayWithViewersConfig.twitchDisabled,
} as const
