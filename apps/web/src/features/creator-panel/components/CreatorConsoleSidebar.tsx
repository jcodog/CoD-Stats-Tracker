"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import {
  CREATOR_WORKSPACE_ICON,
  CREATOR_WORKSPACE_TITLE,
  creatorNavigationSections,
  isCreatorRouteActive,
} from "@/features/creator-panel/lib/creator-panel"

const primaryButtonClassName =
  "[&_svg]:size-5 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden"

export function CreatorConsoleSidebar() {
  const pathname = usePathname()
  const { setOpenMobile, state, isMobile, toggleSidebar } = useSidebar()
  const isCollapsedDesktop = !isMobile && state === "collapsed"
  const WorkspaceIcon = CREATOR_WORKSPACE_ICON

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <button
            aria-label="Toggle creator sidebar"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
            onClick={toggleSidebar}
            type="button"
          >
            <Avatar className="size-9 rounded-xl">
              <AvatarImage alt="CodStats logo" src="/logo.png" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                <WorkspaceIcon className="size-4" />
              </AvatarFallback>
            </Avatar>
          </button>
          <Link
            className="min-w-0 rounded-md group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            href="/creator"
            onClick={() => setOpenMobile(false)}
          >
            <div className="truncate text-sm font-semibold tracking-tight">
              {CREATOR_WORKSPACE_TITLE}
            </div>
            <div className="truncate text-xs text-sidebar-foreground/70">
              Codes, payouts, and creator tools
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        {creatorNavigationSections.map((section) => (
          <SidebarGroup key={section.key}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = isCreatorRouteActive(pathname, item.href, {
                    exact: "exact" in item ? item.exact : undefined,
                  })

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={primaryButtonClassName}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link
                          aria-current={isActive ? "page" : undefined}
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="rounded-md border border-sidebar-border/70 bg-sidebar p-3 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="flex items-center justify-between gap-3 group-data-[collapsible=icon]:justify-center">
            <UserButton
              showName={!isCollapsedDesktop}
              userProfileMode="navigation"
              userProfileUrl="/account"
              appearance={{
                elements: {
                  userButtonTrigger:
                    "outline-none! ring-0! shadow-none! focus:ring-0! focus-visible:ring-0! focus-visible:outline-none! active:ring-0! active:outline-none! data-[state=open]:ring-0! data-[state=open]:shadow-none!",
                  userButtonBox: "flex-row-reverse! gap-0.5! pr-2!",
                },
              }}
            />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
