"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconMenu2 } from "@tabler/icons-react"

import {
  creatorPrimaryNav,
  creatorToolNav,
  type CreatorNavIcon,
} from "@/features/creator-panel/lib/creator-panel"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

type CreatorShellProps = {
  children: React.ReactNode
}

type CreatorNavLink = {
  href: string
  icon: CreatorNavIcon
  label: string
}

function CreatorNavSection({
  items,
  title,
}: Readonly<{
  items: readonly CreatorNavLink[]
  title?: string
}>) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <div className="px-3 text-xs font-medium tracking-wide text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                active && "bg-muted text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function CreatorNavContent() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
        <div className="text-lg font-semibold tracking-tight text-foreground">
          Creator
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your code, payout setup, and creator tools.
        </p>
      </div>

      <CreatorNavSection items={creatorPrimaryNav} />
      <CreatorNavSection items={creatorToolNav} title="Tools" />
    </div>
  )
}

export function CreatorShell({ children }: CreatorShellProps) {
  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-8">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <IconMenu2 data-icon="inline-start" />
              Creator menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[18rem] sm:max-w-[18rem]">
            <SheetHeader>
              <SheetTitle>Creator</SheetTitle>
              <SheetDescription>
                Manage your creator code, payouts, and tools.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <CreatorNavContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden md:block">
        <div className="sticky top-24 border-r border-border/60 pr-6">
          <CreatorNavContent />
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  )
}
