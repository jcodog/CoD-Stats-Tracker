"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { AppUserButton } from "@/components/app-shell/AppUserButton"
import { MobileProtectedSidebar } from "@/components/app-shell/MobileProtectedSidebar"
import { ProtectedNavLinks } from "@/components/app-shell/ProtectedNavLinks"
import type { ProtectedNavItem } from "@/components/app-shell/protected-nav"

type AppShellFrameProps = {
  checkoutEnabled: boolean
  children: ReactNode
  navItems: ProtectedNavItem[]
  showStaffConsoleLink: boolean
}

const protectedShellWidthClass = "max-w-[90rem]"

export function AppShellFrame({
  checkoutEnabled,
  children,
  navItems,
  showStaffConsoleLink,
}: AppShellFrameProps) {
  const pathname = usePathname()

  if (pathname.startsWith("/creator")) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div
          className={`mx-auto flex w-full ${protectedShellWidthClass} items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8`}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md text-base font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-primary/10">
                <AvatarImage src="/logo.png" alt="CodStats logo" />
                <AvatarFallback className="rounded-lg font-semibold">
                  CS
                </AvatarFallback>
              </Avatar>
              CodStats
            </Link>

            <nav
              aria-label="Protected"
              className="hidden items-center gap-2 md:flex"
            >
              <ProtectedNavLinks items={navItems} layout="desktop" />
            </nav>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <AppUserButton
              showStaffConsoleLink={showStaffConsoleLink}
              checkoutEnabled={checkoutEnabled}
            />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <MobileProtectedSidebar
              checkoutEnabled={checkoutEnabled}
              navItems={navItems}
              showStaffConsoleLink={showStaffConsoleLink}
            />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto flex w-full ${protectedShellWidthClass} flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8`}
      >
        {children}
      </main>
    </div>
  )
}
