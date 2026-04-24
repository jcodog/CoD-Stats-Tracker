"use client"

import { Fragment, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconArrowBackUp } from "@tabler/icons-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  CREATOR_WORKSPACE_TITLE,
  resolveCreatorRoute,
} from "@/features/creator-panel/lib/creator-panel"

function CreatorConsoleBreadcrumb({
  items,
}: {
  items: ReturnType<typeof resolveCreatorRoute>["breadcrumbs"]
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/creator">{CREATOR_WORKSPACE_TITLE}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Fragment key={`${item.href ?? item.label}-${index}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function CreatorConsoleHeader({
  actions,
  description,
  title,
}: {
  actions?: ReactNode
  description?: string
  title?: string
}) {
  const pathname = usePathname()
  const currentRoute = resolveCreatorRoute(pathname)

  return (
    <header className="border-b border-border/70 px-4 py-4 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid min-w-0 gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <div className="min-w-0">
              <CreatorConsoleBreadcrumb items={currentRoute.breadcrumbs} />
            </div>
          </div>

          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title ?? currentRoute.title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">
              <IconArrowBackUp aria-hidden="true" data-icon="inline-start" />
              <span className="hidden sm:inline">Return to App</span>
              <span className="sm:hidden">Return</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
