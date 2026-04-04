import { SignInView } from "@/features/auth/views/SignInView"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export default async function SignInPage() {
  const viewport = await resolveRequestViewport()

  return <SignInView viewport={viewport} />
}
