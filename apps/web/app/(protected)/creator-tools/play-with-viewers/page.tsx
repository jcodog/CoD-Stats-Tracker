import { currentUser } from "@clerk/nextjs/server"

import { PlayWithViewersDashboardView } from "@/features/creator-tools/play-with-viewers/views/PlayWithViewersDashboardView"

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
  const clerkUser = await currentUser()

  return (
    <PlayWithViewersDashboardView
      hasTwitchLinked={hasLinkedTwitchAccount(clerkUser?.externalAccounts)}
    />
  )
}
