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
import { CreatorConsoleHeader } from "@/features/creator-panel/components/CreatorConsoleHeader"
import {
  formatCreatorProgramSummary,
  getCreatorConnectPresentation,
  getEstimatedPayoutPresentation,
} from "@/features/creator-panel/lib/creator-panel"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

function CreatorHomeLoadingState() {
  return (
    <div className="grid gap-6">
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

function CreatorConnectStatusLine(args: {
  description: string
  indicatorClassName: string
  label: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${args.indicatorClassName}`}
      />
      <span className="font-medium text-foreground">{args.label}</span>
      <span className="text-muted-foreground">{args.description}</span>
    </div>
  )
}

const pageDescription =
  "Track creator-code performance, payout setup, and the tools that run inside your creator workspace."

export function CreatorHomeView() {
  const dashboard = useQuery(
    api.queries.creator.dashboard.getCurrentCreatorDashboard
  )

  if (dashboard === undefined) {
    return (
      <div className="flex flex-1 flex-col">
        <CreatorConsoleHeader description={pageDescription} />
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <CreatorHomeLoadingState />
        </div>
      </div>
    )
  }

  if (dashboard === null) {
    return (
      <div className="flex flex-1 flex-col">
        <CreatorConsoleHeader description={pageDescription} />
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <Alert>
            <AlertTitle>Creator area unavailable</AlertTitle>
            <AlertDescription>
              Sign in again to load your creator workspace.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!dashboard.creatorAccount) {
    return (
      <div className="flex flex-1 flex-col">
        <CreatorConsoleHeader description={pageDescription} />
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <section className="grid max-w-3xl gap-4 border-y border-border/60 py-5">
            <div className="grid gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Creator profile not configured
              </h2>
              <p className="text-sm text-muted-foreground">
                Creator tools are available on this account, but the referral
                code profile has not been created yet.
              </p>
            </div>
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
          </section>
        </div>
      </div>
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
    <div className="flex flex-1 flex-col">
      <CreatorConsoleHeader description={pageDescription} />
      <div className="grid gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <CreatorConnectStatusLine
            description={connectPresentation.description}
            indicatorClassName={connectPresentation.indicatorClassName}
            label={connectPresentation.label}
          />

          <div className="flex flex-wrap gap-2">
            {dashboard.creatorAccount.connectState !== "ready" ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/creator/connect/start">
                  Continue Stripe setup
                  <IconArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link href="/creator/code">
                Manage creator code
                <IconArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-border/60">
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
            ].map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="flex min-h-[7.5rem] flex-col gap-3 border-b border-border/60 px-0 py-5 sm:px-4 xl:border-r xl:border-b-0 xl:px-5"
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
          <section className="border-y border-border/60 py-5">
            <div className="grid gap-5">
              <div className="text-lg font-semibold tracking-tight text-foreground">
                Program summary
              </div>
              <div className="grid gap-4 text-sm">
                <div className="grid gap-1">
                  <div className="font-medium text-foreground">
                    Discount rule
                  </div>
                  <div className="text-muted-foreground">
                    {programSummary.discount}
                  </div>
                </div>
                <div className="grid gap-1">
                  <div className="font-medium text-foreground">Payout rule</div>
                  <div className="text-muted-foreground">
                    {programSummary.payout}. Estimates stay inside the product
                    until payout review is complete.
                  </div>
                </div>
                <div className="grid gap-1">
                  <div className="font-medium text-foreground">Code state</div>
                  <div className="text-muted-foreground">
                    {dashboard.creatorAccount.codeActive
                      ? `Code ${dashboard.creatorAccount.code} is active.`
                      : `Code ${dashboard.creatorAccount.code} is disabled.`}
                  </div>
                </div>
                <div className="grid gap-1">
                  <div className="font-medium text-foreground">Stripe sync</div>
                  <div className="text-muted-foreground">
                    {dashboard.creatorAccount.connectStatusUpdatedAt
                      ? new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(
                          dashboard.creatorAccount.connectStatusUpdatedAt
                        )
                      : "Starts once onboarding begins."}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-border/60 py-5">
            <div className="flex h-full flex-col gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-lg font-semibold tracking-tight text-foreground">
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
    </div>
  )
}
