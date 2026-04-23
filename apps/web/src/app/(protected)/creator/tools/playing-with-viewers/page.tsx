import { currentUser } from "@clerk/nextjs/server"

import { playWithViewersConfig } from "@/features/creator-tools/play-with-viewers/lib/play-with-viewers-config"
import { PlayWithViewersDashboardView } from "@/features/creator-tools/play-with-viewers/views/PlayWithViewersDashboardView"
import { createPageMetadata } from "@/lib/metadata/page"

type ExternalAccountLike = {
  provider?: string | null
  username?: string | null
}

type CreatorIdentityLike =
  | {
      externalAccounts?: ExternalAccountLike[] | null
      firstName?: string | null
      fullName?: string | null
      lastName?: string | null
      username?: string | null
    }
  | null
  | undefined

function normalizeExternalAccountProvider(provider?: string | null) {
  return provider?.trim().toLowerCase() ?? ""
}

function hasLinkedTwitchAccount(
  externalAccounts: ExternalAccountLike[] | null | undefined
) {
  return (
    externalAccounts?.some((account) => {
      const provider = normalizeExternalAccountProvider(account.provider)
      return provider === "oauth_twitch" || provider === "twitch"
    }) ?? false
  )
}

function findExternalAccountUsername(
  externalAccounts: ExternalAccountLike[] | null | undefined,
  providers: string[]
) {
  const expectedProviders = new Set(providers)

  for (const account of externalAccounts ?? []) {
    if (
      !expectedProviders.has(normalizeExternalAccountProvider(account.provider))
    ) {
      continue
    }

    const username = account.username?.trim()
    if (username) {
      return username
    }
  }

  return null
}

function getFallbackCreatorDisplayName(user: CreatorIdentityLike) {
  const fullName = user?.fullName?.trim()
  if (fullName) {
    return fullName
  }

  const nameFromParts = [user?.firstName?.trim(), user?.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim()
  if (nameFromParts) {
    return nameFromParts
  }

  return user?.username?.trim() ?? ""
}

function resolveCreatorDisplayName(user: CreatorIdentityLike) {
  return (
    findExternalAccountUsername(user?.externalAccounts, [
      "oauth_twitch",
      "twitch",
    ]) ??
    findExternalAccountUsername(user?.externalAccounts, [
      "oauth_discord",
      "discord",
    ]) ??
    getFallbackCreatorDisplayName(user)
  )
}

export const metadata = createPageMetadata("Playing with Viewers")

export default async function CreatorPlayWithViewersPage() {
  const clerkUser = await currentUser()

  return (
    <PlayWithViewersDashboardView
      hasTwitchLinked={hasLinkedTwitchAccount(clerkUser?.externalAccounts)}
      preferredCreatorDisplayName={resolveCreatorDisplayName(clerkUser)}
      twitchEnabled={playWithViewersConfig.twitchEnabled}
    />
  )
}
