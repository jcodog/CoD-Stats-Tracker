"use client"

import type { ReactNode } from "react"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

type CreatorShellProps = {
  children: ReactNode
}

import { CreatorConsoleSidebar } from "@/features/creator-panel/components/CreatorConsoleSidebar"

export function CreatorShell({ children }: CreatorShellProps) {
  return (
    <SidebarProvider className="min-h-svh bg-background">
      <a
        href="#creator-console-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <CreatorConsoleSidebar />
      <SidebarInset className="min-h-svh overflow-hidden bg-background">
        <div
          className="flex min-h-svh w-full min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain supports-[scrollbar-gutter:stable]:[scrollbar-gutter:stable_both-edges]"
          id="creator-console-content"
          tabIndex={-1}
        >
          <div className="flex min-h-full w-full flex-col">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
