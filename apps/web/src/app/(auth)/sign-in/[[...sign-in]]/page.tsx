import { SignInView } from "@/features/auth/views/SignInView"
import { createPageMetadata } from "@/lib/metadata/page"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export const metadata = createPageMetadata("Sign In")

export default async function SignInPage() {
  const viewport = await resolveRequestViewport()

  return <SignInView viewport={viewport} />
}
