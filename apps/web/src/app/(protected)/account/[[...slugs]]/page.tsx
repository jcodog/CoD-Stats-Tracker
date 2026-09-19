import { AccountView } from "@/features/account/views/AccountView"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Account")

export default async function AccountPage() {

  return <AccountView />
}
