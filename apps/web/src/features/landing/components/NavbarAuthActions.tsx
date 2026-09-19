"use client"

import { useAuth } from "@clerk/nextjs"
import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function NavbarAuthActions({
  compact = false,
  context = "nav",
  layout = "inline",
}: {
  compact?: boolean
  context?: "hero" | "nav"
  layout?: "inline" | "stacked" | "responsive"
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const isHero = context === "hero"
  const isStacked = layout === "stacked"
  const wrapperClassName = cn(
    "flex",
    layout === "responsive" && "max-md:w-full max-md:flex-col",
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
    <div className={cn(wrapperClassName, isHero ? "min-h-11" : "min-h-8")}>
      {!isLoaded ? (
        <span
          aria-label="Loading account options"
          className="h-8 w-36 rounded-md bg-muted motion-safe:animate-pulse"
        />
      ) : null}
      {isLoaded && isSignedIn ? (
        <Link
          href="/dashboard"
          className={buttonVariants({
            size: compact ? "sm" : "lg",
            className: primaryClassName,
          })}
        >
          Go to Dashboard
        </Link>
      ) : null}

      {isLoaded && !isSignedIn ? (
        <>
          <Link className={secondaryLinkClassName} href="/sign-in">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className={buttonVariants({
              size: compact ? "sm" : "lg",
              className: primaryClassName,
            })}
          >
            {isHero ? "Get Started" : "Sign Up"}
          </Link>
        </>
      ) : null}
    </div>
  )
}
