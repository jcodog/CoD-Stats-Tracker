import { currentUser } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { PlayWithViewersDashboardView } from "@/features/creator-tools/play-with-viewers/views/PlayWithViewersDashboardView"
import { getCreatorToolsAccessState } from "@/lib/server/creator-tools-access"

function hasLinkedTwitchAccount(
  externalAccounts: Array<{ provider?: string | null }> | null | undefined
) {
  return (
    externalAccounts?.some((account) => {
      const provider = account.provider?.toLowerCase()
      return provider === "oauth_twitch" || provider === "twitch"
    }) ?? false
  )
}

export default async function PlayWithViewersPage() {
  const [creatorToolsAccess, clerkUser] = await Promise.all([
    getCreatorToolsAccessState(),
    currentUser(),
  ])

  if (creatorToolsAccess.isSignedIn && !creatorToolsAccess.hasCreatorAccess) {
    notFound()
  }

  return (
    <PlayWithViewersDashboardView
      hasTwitchLinked={hasLinkedTwitchAccount(clerkUser?.externalAccounts)}
    />
  )
}
