"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

type StaffRouteTabsProps = {
  showManagement: boolean
}

type StaffTab = {
  href: string
  label: string
}

function resolveCurrentTab(pathname: string) {
  if (pathname.startsWith("/staff/management")) {
    return "/staff/management"
  }

  if (pathname.startsWith("/staff/billing")) {
    return "/staff/billing"
  }

  return "/staff"
}

export function StaffRouteTabs({ showManagement }: StaffRouteTabsProps) {
  const pathname = usePathname()
  const router = useRouter()
  const tabs = useMemo<StaffTab[]>(
    () =>
      [
        {
          href: "/staff",
          label: "Overview",
        },
        {
          href: "/staff/billing",
          label: "Billing",
        },
        showManagement
          ? {
              href: "/staff/management",
              label: "Management",
            }
          : null,
      ].filter((tab): tab is StaffTab => tab !== null),
    [showManagement]
  )
  const currentTab = resolveCurrentTab(pathname)

  return (
    <Tabs
      className="gap-0"
      onValueChange={(value) => {
        if (value !== currentTab) {
          router.push(value)
        }
      }}
      value={currentTab}
    >
      <TabsList
        className="h-10 w-full justify-start gap-1 rounded-none border-b border-border/70 bg-transparent p-0 text-sm"
        variant="line"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            className="h-10 rounded-none border-b-2 border-transparent px-3 font-normal data-active:border-foreground/70 data-active:bg-transparent data-active:shadow-none after:hidden"
            key={tab.href}
            value={tab.href}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
