import { SignUpView } from "@/features/auth/views/SignUpView"
import { createPageMetadata } from "@/lib/metadata/page"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export const metadata = createPageMetadata("Sign Up")

export default async function SignUpPage() {
  const viewport = await resolveRequestViewport()

  return <SignUpView viewport={viewport} />
}
