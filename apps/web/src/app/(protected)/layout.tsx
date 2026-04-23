import { AppShell } from "@/components/app-shell/AppShell"
import { AppAuthGate } from "@/features/auth/components/AppAuthGate"
import { canonicalizePendingCreatorAttribution } from "@/lib/server/creator-attribution"

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await canonicalizePendingCreatorAttribution()

  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  )
}
