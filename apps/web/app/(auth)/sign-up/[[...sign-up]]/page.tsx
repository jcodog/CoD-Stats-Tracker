import { SignUpView } from "@/features/auth/views/SignUpView"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export default async function SignUpPage() {
  const viewport = await resolveRequestViewport()

  return <SignUpView viewport={viewport} />
}
