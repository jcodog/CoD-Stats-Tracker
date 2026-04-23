"use client"

import Link from "next/link"
import { startTransition, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import {
  IconArrowRight,
  IconCircleCheck,
  IconCopy,
  IconLink,
  IconPlugConnected,
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

function CreatorCodeLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-84" />
      </div>
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}

export function CreatorCodeView() {
  const dashboard = useQuery(api.queries.creator.dashboard.getCurrentCreatorDashboard)
  const setCodeActiveState = useMutation(
    api.mutations.creator.account.setCurrentCreatorCodeActiveState
  )
  const [isSaving, setIsSaving] = useState(false)

  if (dashboard === undefined) {
    return <CreatorCodeLoadingState />
  }

  if (dashboard === null) {
    return (
      <Alert>
        <AlertTitle>Creator code unavailable</AlertTitle>
        <AlertDescription>
          Sign in again to load your creator code settings.
        </AlertDescription>
      </Alert>
    )
  }

  if (!dashboard.creatorAccount) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No creator code configured</EmptyTitle>
          <EmptyDescription>
            This account can access creator tools, but the referral code record
            has not been set up yet.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/creator">Back to creator home</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/creator/tools/playing-with-viewers">
              Open playing with viewers
            </Link>
          </Button>
        </div>
      </Empty>
    )
  }

  const programSummary = formatCreatorProgramSummary({
    discountPercent: dashboard.creatorAccount.discountPercent,
    payoutPercent: dashboard.creatorAccount.payoutPercent,
  })
  const connectPresentation = getCreatorConnectPresentation(
    dashboard.creatorAccount.connectState
  )
  const estimatedPayout = getEstimatedPayoutPresentation({
    paidConversionCount: dashboard.paidConversionCount,
    payoutEligible: dashboard.creatorAccount.payoutEligible,
  })

  const sharePath = dashboard.creatorAccount.sharePath

  async function handleCopyShareLink() {
    const shareUrl = `${window.location.origin}${sharePath}`
    await navigator.clipboard.writeText(shareUrl)
    toast.success("Share link copied.")
  }

  function handleToggleCode() {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    startTransition(() => {
      setCodeActiveState({
        codeActive: !dashboard.creatorAccount?.codeActive,
      })
        .then(() => {
          toast.success(
            dashboard.creatorAccount?.codeActive
              ? "Creator code disabled."
              : "Creator code enabled."
          )
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Update failed.")
        })
        .finally(() => {
          setIsSaving(false)
        })
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Creator code
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Control your creator link, check setup status, and understand how the
          first-month discount and payout rule apply to your code.
        </p>
      </div>

      {dashboard.creatorAccount.pendingActions.length > 0 ? (
        <Alert>
          <AlertTitle>Setup required</AlertTitle>
          <AlertDescription>
            {dashboard.creatorAccount.pendingActions.join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-lg font-semibold tracking-tight text-foreground">
                Program summary
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    dashboard.creatorAccount.codeActive ? "secondary" : "outline"
                  }
                >
                  {dashboard.creatorAccount.codeActive ? "Active" : "Disabled"}
                </Badge>
                <Badge variant={connectPresentation.variant}>
                  {connectPresentation.label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isSaving}
                onClick={handleToggleCode}
                size="sm"
                variant="outline"
              >
                {isSaving
                  ? "Saving..."
                  : dashboard.creatorAccount.codeActive
                    ? "Disable code"
                    : "Enable code"}
              </Button>
              <Button onClick={handleCopyShareLink} size="sm">
                <IconCopy data-icon="inline-start" />
                Copy share link
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="creator-code">Creator code</FieldLabel>
              <Input
                id="creator-code"
                readOnly
                value={dashboard.creatorAccount.code}
              />
              <FieldDescription>
                Share {dashboard.creatorAccount.code} or the full referral link
                to keep attribution attached through sign-up and checkout.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="creator-link">Share link</FieldLabel>
              <Input id="creator-link" readOnly value={sharePath} />
              <FieldDescription>
                The full copied URL uses the current site origin with this path.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="grid gap-0 rounded-lg border border-border/60 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                detail: "Applied automatically on eligible first-month checkout.",
                icon: IconLink,
                label: "Discount summary",
                value: programSummary.discount,
              },
              {
                detail: "Final amount is reviewed before payout.",
                icon: IconCircleCheck,
                label: "Estimated payout",
                value: estimatedPayout.value,
              },
              {
                detail: "Users attributed to this code.",
                icon: IconPlugConnected,
                label: "Attributed signups",
                value: String(dashboard.signupCount),
              },
              {
                detail: "Attributed users with a paid subscription.",
                icon: IconArrowRight,
                label: "Paid conversions",
                value: String(dashboard.paidConversionCount),
              },
            ].map((item, index) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="flex min-h-28 flex-col gap-3 border-b border-border/60 p-4 sm:border-r xl:border-b-0"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="size-4" />
                    {item.label}
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {item.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="text-lg font-semibold tracking-tight text-foreground">
            Stripe setup
          </div>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={connectPresentation.variant}>
              {connectPresentation.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {connectPresentation.description}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-foreground">
                Payout summary
              </div>
              <p className="text-sm text-muted-foreground">
                {programSummary.payout}. Stripe Connect onboarding and account
                management slot into this section next without changing the page
                structure.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium text-foreground">
                Current requirements
              </div>
              {dashboard.creatorAccount.requirementsDue.length > 0 ? (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                  {dashboard.creatorAccount.requirementsDue.map((requirement: string) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No outstanding Stripe requirements are recorded for this
                  creator account.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
