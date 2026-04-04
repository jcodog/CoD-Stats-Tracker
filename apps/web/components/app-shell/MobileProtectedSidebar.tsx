"use client"

import Link from "next/link"
import { IconMenu2 } from "@tabler/icons-react"
import { usePathname } from "next/navigation"

import { AppUserButton } from "@/components/app-shell/AppUserButton"
import {
  type ProtectedNavItem,
  isProtectedNavItemActive,
} from "@/components/app-shell/protected-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@workspace/ui/components/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"

type MobileProtectedSidebarProps = {
  checkoutEnabled?: boolean
  navItems: ProtectedNavItem[]
  showStaffConsoleLink?: boolean
}

function MobileProtectedSidebarTrigger() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      aria-label="Open navigation"
      className="md:hidden"
      onClick={toggleSidebar}
      size="icon-sm"
      variant="ghost"
    >
      <IconMenu2 aria-hidden="true" />
    </Button>
  )
}

function ProtectedSidebarMenu({
  checkoutEnabled = false,
  navItems,
  showStaffConsoleLink = false,
}: MobileProtectedSidebarProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas" side="right">
      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="px-0">
          <SidebarMenu className="gap-1">
            {navItems.map((item: ProtectedNavItem) => {
              const isActive = isProtectedNavItemActive(pathname, item)

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="relative h-11 rounded-lg px-3 pl-4 text-sidebar-foreground/80 data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    isActive={isActive}
                  >
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      href={item.href}
                      onClick={() => setOpenMobile(false)}
                    >
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-primary shadow-[0_0_0.9rem_hsl(var(--primary)/0.32),0_0_0.18rem_hsl(var(--primary)/0.7)]"
                          )}
                        />
                      ) : null}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar px-3 py-2">
          <AppUserButton
            checkoutEnabled={checkoutEnabled}
            showStaffConsoleLink={showStaffConsoleLink}
          />
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export function MobileProtectedSidebar(props: MobileProtectedSidebarProps) {
  const isMobile = useIsMobile()

  return (
    <SidebarProvider className="contents">
      <MobileProtectedSidebarTrigger />
      {isMobile ? <ProtectedSidebarMenu {...props} /> : null}
    </SidebarProvider>
  )
}
