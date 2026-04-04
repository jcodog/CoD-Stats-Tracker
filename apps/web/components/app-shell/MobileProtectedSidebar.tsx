"use client"

import { IconMenu } from "@tabler/icons-react"

import { AppUserButton } from "@/components/app-shell/AppUserButton"
import { ProtectedNavLinks } from "@/components/app-shell/ProtectedNavLinks"
import type { ProtectedNavItem } from "@/components/app-shell/protected-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { Separator } from "@workspace/ui/components/separator"

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
          <IconMenu aria-hidden="true" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[min(22rem,calc(100vw-1rem))] data-[vaul-drawer-direction=right]:max-w-none">
        <DrawerHeader className="items-start border-b border-border/60 px-4 py-4 text-left">
          <DrawerTitle>Navigation</DrawerTitle>
          <DrawerDescription>
            Open protected sections and account controls.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <AppUserButton showStaffConsoleLink={showStaffConsoleLink} />
            <ThemeToggle />
          </div>

          <Separator className="my-4" />

          <nav aria-label="Protected mobile" className="flex flex-col gap-2">
            <ProtectedNavLinks
              closeOnNavigate
              items={navItems}
              layout="mobile"
            />
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
