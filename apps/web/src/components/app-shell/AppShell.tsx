import { getViewer } from "@/lib/server/viewer"

import {
  getParsedUserRoleState,
  roleMeetsRequirement,
} from "@workspace/backend/lib/staffRoles"
import { AppShellFrame } from "@/components/app-shell/AppShellFrame"
import { isFlagEnabled } from "@/lib/flags"
import type { ProtectedNavItem } from "@/components/app-shell/protected-nav"

type AppShellProps = {
  children: React.ReactNode
}

export async function AppShell({ children }: AppShellProps) {
  const [checkoutEnabled, viewer] = await Promise.all([
    isFlagEnabled("checkout"),
    getViewer(),
  ])
  const clerkRole = getParsedUserRoleState(
    viewer.clerkUser?.publicMetadata?.role
  ).role
  const showStaffConsoleLink =
    clerkRole === viewer.access?.role &&
    roleMeetsRequirement(viewer.access?.role ?? "user", "staff")
  const protectedNavItems: ProtectedNavItem[] = [
    { href: "/dashboard", label: "Home", matchPaths: ["/dashboard"] },
    ...(viewer.access?.hasCreatorAccess
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
