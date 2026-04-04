"use client"

import { IconMenu2 } from "@tabler/icons-react"

import { AppUserButton } from "@/components/app-shell/AppUserButton"
import { ProtectedNavLinks } from "@/components/app-shell/ProtectedNavLinks"
import type { ProtectedNavItem } from "@/components/app-shell/protected-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"

type MobileProtectedSidebarProps = {
  navItems: ProtectedNavItem[]
  showStaffConsoleLink?: boolean
}

export function MobileProtectedSidebar({
  navItems,
  showStaffConsoleLink = false,
}: MobileProtectedSidebarProps) {
  return (
    <Drawer direction="right" shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="md:hidden"
          size="icon-sm"
          variant="ghost"
        >
          <IconMenu2 aria-hidden="true" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[min(22rem,calc(100vw-1rem))] data-[vaul-drawer-direction=right]:max-w-none">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <nav aria-label="Protected mobile" className="flex flex-col gap-2">
            <ProtectedNavLinks
              closeOnNavigate
              items={navItems}
              layout="mobile"
            />
          </nav>
        </div>
        <DrawerFooter className="flex-row justify-between gap-3 border-t">
          <AppUserButton showStaffConsoleLink={showStaffConsoleLink} />
          <ThemeToggle />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
