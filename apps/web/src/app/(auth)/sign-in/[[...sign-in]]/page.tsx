import { SignInView } from "@/features/auth/views/SignInView"
import { createPageMetadata } from "@/lib/metadata/page"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"

export const metadata = createPageMetadata("Sign In")

export default async function SignInPage() {
  const pendingCreatorCode = await getPendingCreatorCodeSummary()

  return <SignInView pendingCreatorCode={pendingCreatorCode} />
}
