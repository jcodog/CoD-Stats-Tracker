"use client"

import Link from "next/link"
import {
  IconArrowRight,
  IconChartLine,
  IconCrown,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"

type DashboardUpgradeButtonProps = {
  className?: string
  href?: string
  label?: string
  size?: "default" | "sm" | "lg"
}

export function DashboardUpgradeButton({
  className,
  href = "/settings/billing/plan",
  label = "Upgrade",
  size = "sm",
}: DashboardUpgradeButtonProps) {
  return (
    <Button
      asChild
      className={cn(
        "border-primary/40 bg-primary/15 text-primary-foreground shadow-[0_0_0.9rem_hsl(var(--primary)/0.16)] hover:bg-primary/25",
        "supports-backdrop-filter:bg-primary/12 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      size={size}
    >
      <Link href={href}>
        <IconCrown aria-hidden="true" />
        {label}
      </Link>
    </Button>
  )
}

type DashboardUpgradePromptProps = {
  className?: string
  compact?: boolean
  href?: string
}

export function DashboardUpgradePrompt({
  className,
  compact = false,
  href = "/settings/billing/plan",
}: DashboardUpgradePromptProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-primary/20 bg-background",
        "shadow-[0_0_0_1px_hsl(var(--primary)/0.05),0_1.2rem_3rem_hsl(var(--background)/0.45)]",
        compact ? "px-4 py-4" : "px-5 py-5 sm:px-6 sm:py-5",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(110deg,hsl(var(--primary)/0.08),transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 -z-10 h-28 w-72 translate-x-16 translate-y-10 rounded-full bg-primary/10 blur-3xl"
      />

      <div
        className={cn(
          "grid gap-4",
          compact
            ? "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            : "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        )}
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="border-primary/25 bg-primary/10 text-primary-foreground"
              variant="outline"
            >
              Free plan
            </Badge>
            <span className="text-xs text-muted-foreground">
              Upgrade when you want deeper ranked insight.
            </span>
          </div>

          <div className="grid gap-2">
            <h2
              className={cn(
                "font-semibold tracking-tight text-balance",
                compact ? "text-lg" : "text-xl sm:text-2xl"
              )}
            >
              Unlock the full ranked stats experience
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Premium adds advanced analytics, graphical stat cards, multiple
              sessions, and the tools that make your match history easier to
              review.
            </p>
          </div>

          {!compact ? (
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span className="inline-flex items-center gap-2">
                <IconChartLine
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Advanced analytics
              </span>
              <span className="inline-flex items-center gap-2">
                <IconSparkles
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Better stat cards
              </span>
              <span className="inline-flex items-center gap-2">
                <IconCrown aria-hidden="true" className="size-4 text-primary" />
                Creator tools available
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            className="border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href={href}>
              View plans
              <IconArrowRight aria-hidden="true" />
            </Link>
          </Button>

          <UpgradeDialog href={href} />
        </div>
      </div>
    </section>
  )
}

function UpgradeDialog({ href }: { href: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">What do I get?</Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden border-border/70 bg-background p-0 sm:max-w-lg">
        <div className="relative isolate px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_5%,hsl(var(--primary)/0.18),transparent_34%)]"
          />
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="grid gap-2">
                <Badge
                  className="w-fit border-primary/25 bg-primary/10 text-primary-foreground"
                  variant="outline"
                >
                  Premium
                </Badge>
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Ready for deeper ranked insight?
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="leading-6">
              Upgrade when you want stronger review tools, cleaner stat visuals,
              and more room to track your ranked sessions.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-3 text-sm">
            {[
              "Track multiple sessions instead of a single current run.",
              "Generate cleaner graphical views for sharing and review.",
              "Use advanced analysis tools to spot trends faster.",
              "Unlock creator tools when you move to the Creator plan.",
            ].map((item) => (
              <div
                className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                key={item}
              >
                <IconSparkles
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-border/60 bg-background/95 px-5 py-4 sm:px-6">
          <DialogClose asChild>
            <Button variant="ghost">
              <IconX aria-hidden="true" />
              Maybe later
            </Button>
          </DialogClose>
          <Button asChild>
            <Link href={href}>
              Compare plans
              <IconArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
