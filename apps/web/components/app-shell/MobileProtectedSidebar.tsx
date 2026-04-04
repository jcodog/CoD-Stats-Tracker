"use client"

import Link from "next/link"
import { IconMenu2 } from "@tabler/icons-react"

import { AppUserButton } from "@/components/app-shell/AppUserButton"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { Separator } from "@workspace/ui/components/separator"

type ProtectedNavItem = {
  href: string
  label: string
}

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
          variant="outline"
        >
          <IconMenu2 aria-hidden="true" />
        </Button>
      </DrawerTrigger>

      <DrawerContent
        className="data-[vaul-drawer-direction=right]:w-[min(22rem,calc(100vw-1rem))] data-[vaul-drawer-direction=right]:max-w-none"
      >
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
            {navItems.map((item) => (
              <DrawerClose asChild key={item.href}>
                <Button
                  asChild
                  className="h-11 justify-start rounded-lg px-3 text-sm font-medium"
                  variant="ghost"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </DrawerClose>
            ))}
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
