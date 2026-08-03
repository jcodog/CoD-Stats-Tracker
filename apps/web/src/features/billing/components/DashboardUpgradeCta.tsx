"use client"

import Link from "next/link"
import { useState } from "react"
import {
  IconArrowRight,
  IconChartLine,
  IconCrown,
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
        "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90",
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
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-primary/25 bg-background",
        compact ? "px-4 py-4" : "px-5 py-5 sm:px-6 sm:py-5",
        className
      )}
    >
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
              className="rounded-md border-primary/25 bg-primary/10 text-foreground"
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
                compact ? "text-base" : "text-lg"
              )}
            >
              Unlock deeper ranked insight
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Upgrade when you want advanced analytics, graphical stat views,
              multiple sessions, and creator tools on Creator.
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
                <IconChartLine
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Graphical stat views
              </span>
              <span className="inline-flex items-center gap-2">
                <IconCrown aria-hidden="true" className="size-4 text-primary" />
                Creator tools on Creator
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            className="border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Link href={href}>
              Upgrade
              <IconArrowRight aria-hidden="true" />
            </Link>
          </Button>

          <UpgradeDialog href={href} />
          <Button
            aria-label="Dismiss upgrade prompt"
            onClick={() => setDismissed(true)}
            size="icon"
            variant="ghost"
          >
            <IconX aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function UpgradeDialog({ href }: { href: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          What do I get?
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden border-border/70 bg-background p-0 sm:max-w-lg">
        <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="grid gap-2">
                <Badge
                  className="w-fit rounded-md border-primary/25 bg-primary/10 text-foreground"
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
                <IconChartLine
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
