import { SignUpView } from "@/features/auth/views/SignUpView"
import { createPageMetadata } from "@/lib/metadata/page"
import { getPendingCreatorCodeSummary } from "@/lib/server/creator-attribution"

export const metadata = createPageMetadata("Sign Up")

export default async function SignUpPage() {
  const pendingCreatorCode = await getPendingCreatorCodeSummary()

  return <SignUpView pendingCreatorCode={pendingCreatorCode} />
}
