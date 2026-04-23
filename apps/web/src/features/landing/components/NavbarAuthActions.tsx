"use client"

import { Authenticated, Unauthenticated } from "convex/react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function NavbarAuthActions({
  compact = false,
  context = "nav",
  layout = "inline",
}: {
  compact?: boolean
  context?: "hero" | "nav"
  layout?: "inline" | "stacked"
}) {
  const isHero = context === "hero"
  const isStacked = layout === "stacked"
  const wrapperClassName = cn(
    "flex",
    isStacked
      ? "flex-col gap-2"
      : compact
        ? "min-w-0 shrink-0 items-center gap-1.5"
        : "items-center gap-2"
  )
  const primaryClassName = cn(
    isHero
      ? "h-11 px-5 text-sm"
      : compact
        ? "h-8 px-2.5 text-[0.8125rem]"
        : "h-9 px-4 text-sm",
    isStacked && "w-full justify-center"
  )
  const secondaryLinkClassName = cn(
    "inline-flex items-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    isHero
      ? "h-11 justify-center border border-border/70 px-5 text-sm hover:bg-muted"
      : compact
        ? "h-8 px-2 text-[0.8125rem] text-foreground/80 hover:text-foreground"
        : "h-9 px-2 text-sm text-foreground/80 hover:text-foreground",
    isStacked && "w-full justify-center"
  )

  return (
    <div className={wrapperClassName}>
      <Authenticated>
        <Button asChild size={compact ? "sm" : "lg"} className={primaryClassName}>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </Authenticated>

      <Unauthenticated>
        <Link className={secondaryLinkClassName} href="/sign-in">
          Sign In
        </Link>
        <Button asChild size={compact ? "sm" : "lg"} className={primaryClassName}>
          <Link href="/sign-up">{isHero ? "Get Started" : "Sign Up"}</Link>
        </Button>
      </Unauthenticated>
    </div>
  )
}
