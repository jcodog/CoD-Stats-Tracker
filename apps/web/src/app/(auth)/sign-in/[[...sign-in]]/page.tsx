import { SignInView } from "@/features/auth/views/SignInView"
import { createPageMetadata } from "@/lib/metadata/page"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export const metadata = createPageMetadata("Sign In")

export default async function SignInPage() {
  const [pendingCreatorCode, viewport] = await Promise.all([
    getPendingCreatorCodeSummary(),
    resolveRequestViewport(),
  ])

  return <SignInView pendingCreatorCode={pendingCreatorCode} viewport={viewport} />
}
