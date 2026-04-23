import { AccountView } from "@/features/account/views/AccountView"
import { createPageMetadata } from "@/lib/metadata/page"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export const metadata = createPageMetadata("Account")

export default async function AccountPage() {
  const viewport = await resolveRequestViewport()

  return <AccountView viewport={viewport} />
}
