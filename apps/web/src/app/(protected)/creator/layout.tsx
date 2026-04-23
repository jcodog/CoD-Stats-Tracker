import { notFound } from "next/navigation"

import { CreatorShell } from "@/features/creator-panel/components/CreatorShell"
import { getCreatorToolsAccessState } from "@/lib/server/creator-tools-access"

export default async function CreatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const creatorToolsAccess = await getCreatorToolsAccessState()

  if (creatorToolsAccess.isSignedIn && !creatorToolsAccess.hasCreatorAccess) {
    notFound()
  }

  return <CreatorShell>{children}</CreatorShell>
}
