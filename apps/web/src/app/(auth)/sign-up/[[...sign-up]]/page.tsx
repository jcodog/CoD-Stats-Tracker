import { SignUpView } from "@/features/auth/views/SignUpView"
import { createPageMetadata } from "@/lib/metadata/page"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export const metadata = createPageMetadata("Sign Up")

export default async function SignUpPage() {
  const [pendingCreatorCode, viewport] = await Promise.all([
    getPendingCreatorCodeSummary(),
    resolveRequestViewport(),
  ])

  return <SignUpView pendingCreatorCode={pendingCreatorCode} viewport={viewport} />
}
