import { AccountView } from "@/features/account/views/AccountView"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export default async function AccountPage() {
  const viewport = await resolveRequestViewport()

  return <AccountView viewport={viewport} />
}
