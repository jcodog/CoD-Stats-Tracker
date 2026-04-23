"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import {
  IconArrowRight,
  IconCircleCheck,
  IconCurrencyDollar,
  IconLink,
  IconPlugConnected,
  IconUsers,
} from "@tabler/icons-react"

import { api } from "@workspace/backend/convex/_generated/api"
import {
  formatCreatorProgramSummary,
  getCreatorConnectPresentation,
  getEstimatedPayoutPresentation,
} from "@/features/creator-panel/lib/creator-panel"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"

function CreatorHomeLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-84" />
      </div>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-28 flex-col gap-3 border-b border-border/60 p-5 xl:border-r xl:border-b-0"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  )
}

export function CreatorHomeView() {
  const dashboard = useQuery(api.queries.creator.dashboard.getCurrentCreatorDashboard)

  if (dashboard === undefined) {
    return <CreatorHomeLoadingState />
  }

  if (dashboard === null) {
    return (
      <Alert>
        <AlertTitle>Creator area unavailable</AlertTitle>
        <AlertDescription>
          Sign in again to load your creator workspace.
        </AlertDescription>
      </Alert>
    )
  }

  if (!dashboard.creatorAccount) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Creator profile not configured</EmptyTitle>
          <EmptyDescription>
            Creator tools are available on this account, but the referral code
            profile has not been created yet.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/creator/tools/playing-with-viewers">
              Open playing with viewers
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </Empty>
    )
  }

  const connectPresentation = getCreatorConnectPresentation(
    dashboard.creatorAccount.connectState
  )
  const estimatedPayout = getEstimatedPayoutPresentation({
    paidConversionCount: dashboard.paidConversionCount,
    payoutEligible: dashboard.creatorAccount.payoutEligible,
  })
  const programSummary = formatCreatorProgramSummary({
    discountPercent: dashboard.creatorAccount.discountPercent,
    payoutPercent: dashboard.creatorAccount.payoutPercent,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Creator
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Track creator-code performance, payout setup, and the tools that run
            inside your creator workspace.
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/creator/code">
            Manage creator code
            <IconArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              detail: estimatedPayout.detail,
              icon: IconCurrencyDollar,
              label: "Estimated payout",
              value: estimatedPayout.value,
            },
            {
              detail: dashboard.creatorAccount.codeActive
                ? "Sharing is live."
                : "Sharing is paused.",
              icon: IconLink,
              label: "Creator code",
              value: dashboard.creatorAccount.codeActive
                ? dashboard.creatorAccount.code
                : "Disabled",
            },
            {
              detail: connectPresentation.description,
              icon: IconPlugConnected,
              label: "Stripe setup",
              value: connectPresentation.label,
            },
            {
              detail: "Users attributed to your creator code.",
              icon: IconUsers,
              label: "Attributed signups",
              value: String(dashboard.signupCount),
            },
            {
              detail: "Attributed users with a paid subscription.",
              icon: IconCircleCheck,
              label: "Paid conversions",
              value: String(dashboard.paidConversionCount),
            },
          ].map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="flex min-h-32 flex-col gap-3 border-b border-border/60 p-5 sm:min-h-28 xl:border-b-0 xl:border-r"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4" />
                  {item.label}
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {item.value}
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            )
          })}
        </div>
      </section>

      {dashboard.creatorAccount.pendingActions.length > 0 ? (
        <Alert>
          <AlertTitle>Setup still needs attention</AlertTitle>
          <AlertDescription>
            {dashboard.creatorAccount.pendingActions.join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="text-lg font-semibold tracking-tight text-foreground">
              Program summary
            </div>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium text-foreground">
                Discount rule
              </div>
              <div className="text-sm text-muted-foreground">
                {programSummary.discount}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium text-foreground">
                Payout rule
              </div>
              <div className="text-sm text-muted-foreground">
                {programSummary.payout}. Estimates stay inside the product until
                payout review is complete.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connectPresentation.variant}>
                {connectPresentation.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {dashboard.creatorAccount.codeActive
                  ? `Code ${dashboard.creatorAccount.code} is active.`
                  : `Code ${dashboard.creatorAccount.code} is disabled.`}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="text-lg font-semibold tracking-tight text-foreground">
              Tools
            </div>
          </div>
          <div className="flex h-full flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium text-foreground">
                Playing with viewers
              </div>
              <p className="text-sm text-muted-foreground">
                Run your Discord and Twitch queue workflow from the creator
                workspace.
              </p>
            </div>
            <div className="mt-auto">
              <Button asChild size="sm">
                <Link href="/creator/tools/playing-with-viewers">
                  Open tool
                  <IconArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
