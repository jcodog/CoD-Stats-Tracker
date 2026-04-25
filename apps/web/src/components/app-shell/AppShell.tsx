import { currentUser } from "@clerk/nextjs/server"

import {
  getParsedUserRoleState,
  roleMeetsRequirement,
} from "@workspace/backend/lib/staffRoles"
import { getCreatorToolsAccessState } from "@/lib/server/creator-tools-access"
import { AppShellFrame } from "@/components/app-shell/AppShellFrame"
import { isFlagEnabled } from "@/lib/flags"
import type { ProtectedNavItem } from "@/components/app-shell/protected-nav"

type AppShellProps = {
  children: React.ReactNode
}

export async function AppShell({ children }: AppShellProps) {
  const [checkoutEnabled, creatorToolsAccess, clerkUser] = await Promise.all([
    isFlagEnabled("checkout"),
    getCreatorToolsAccessState(),
    currentUser(),
  ])
  const showStaffConsoleLink = roleMeetsRequirement(
    getParsedUserRoleState(clerkUser?.publicMetadata?.role).role ?? "user",
    "staff"
  )
  const protectedNavItems: ProtectedNavItem[] = [
    { href: "/dashboard", label: "Home", matchPaths: ["/dashboard"] },
    ...(creatorToolsAccess.hasCreatorAccess
      ? [
          {
            href: "/creator",
            label: "Creator",
            matchPaths: ["/creator", "/creator-tools"],
          },
        ]
      : []),
  ]

  return (
    <AppShellFrame
      checkoutEnabled={checkoutEnabled}
      navItems={protectedNavItems}
      showStaffConsoleLink={showStaffConsoleLink}
    >
      {children}
    </AppShellFrame>
  )
}
