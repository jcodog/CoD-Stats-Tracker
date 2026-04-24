"use client"

import Link from "next/link"
import { startTransition, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useSearchParams } from "next/navigation"
import {
  IconArrowRight,
  IconCircleCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconPlugConnected,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react"

import { api } from "@workspace/backend/convex/_generated/api"
import { formatCreatorRequirementLabel } from "@workspace/backend/convex/lib/creatorProgram"
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

function formatDateTime(value: number | null | undefined) {
  if (!value) {
    return "Not synced yet"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function CreatorRequirementList(args: {
  emptyLabel: string
  requirements: string[]
  title: string
}) {
  return (
    <div className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
      <div className="text-sm font-medium text-foreground">{args.title}</div>
      {args.requirements.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
          {args.requirements.map((requirement) => (
            <li key={requirement}>
              {formatCreatorRequirementLabel(requirement)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{args.emptyLabel}</p>
      )}
    </div>
  )
}

function CreatorConnectStatusLine(args: {
  description?: string
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
      {args.description ? (
        <span className="text-muted-foreground">{args.description}</span>
      ) : null}
    </div>
  )
}

function CreatorCodeLoadingState() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

const pageDescription =
  "Run your referral code, confirm the configured economics, and manage the Stripe Connect state that controls payout readiness."

export function CreatorCodeView() {
  const dashboard = useQuery(
    api.queries.creator.dashboard.getCurrentCreatorDashboard
  )
  const setCodeActiveState = useMutation(
    api.mutations.creator.account.setCurrentCreatorCodeActiveState
  )
  const searchParams = useSearchParams()
  const [isSaving, setIsSaving] = useState(false)

  if (dashboard === undefined) {
    return (
      <div className="flex flex-1 flex-col">
        <CreatorConsoleHeader description={pageDescription} />
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <CreatorCodeLoadingState />
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
            <AlertTitle>Creator code unavailable</AlertTitle>
            <AlertDescription>
              Sign in again to load your creator code settings.
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
                No creator code configured
              </h2>
              <p className="text-sm text-muted-foreground">
                This account can access creator tools, but the creator profile
                has not been provisioned yet.
              </p>
            </div>
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
          </section>
        </div>
      </div>
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
  const connectIntent = searchParams.get("connect")
  const connectMessage = searchParams.get("message")
  const connectActionLabel =
    dashboard.creatorAccount.connectState === "not_started"
      ? "Start Stripe onboarding"
      : dashboard.creatorAccount.connectState === "ready"
        ? "Review Stripe setup"
        : "Resume Stripe onboarding"

  async function handleCopyCode() {
    await navigator.clipboard.writeText(dashboard.creatorAccount.code)
    toast.success("Creator code copied.")
  }

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
    <div className="flex flex-1 flex-col">
      <CreatorConsoleHeader description={pageDescription} />
      <div className="grid gap-6 px-4 py-6 md:px-6 lg:px-8">
        {connectIntent === "returned" ? (
          <Alert>
            <AlertTitle>Stripe setup refreshed</AlertTitle>
            <AlertDescription>
              Your latest Connect state has been synced back into the creator
              workspace.
            </AlertDescription>
          </Alert>
        ) : null}

        {connectIntent === "refreshed" ? (
          <Alert>
            <AlertTitle>Stripe status refreshed</AlertTitle>
            <AlertDescription>
              The creator workspace re-synced your current Connect account
              state.
            </AlertDescription>
          </Alert>
        ) : null}

        {connectIntent === "error" ? (
          <Alert>
            <AlertTitle>Stripe setup needs another try</AlertTitle>
            <AlertDescription>
              {connectMessage?.trim() ||
                "Unable to complete the Stripe request."}
            </AlertDescription>
          </Alert>
        ) : null}

        {dashboard.creatorAccount.pendingActions.length > 0 ? (
          <Alert>
            <AlertTitle>Action required</AlertTitle>
            <AlertDescription>
              {dashboard.creatorAccount.pendingActions.join(" ")}
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="border-y border-border/60">
          <div className="py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="text-lg font-semibold tracking-tight text-foreground">
                  Creator code configuration
                </div>
                <div className="grid gap-1">
                  <div className="text-sm text-muted-foreground">
                    {dashboard.creatorAccount.codeActive
                      ? "Code is live."
                      : "Code is disabled."}
                  </div>
                  <CreatorConnectStatusLine
                    indicatorClassName={connectPresentation.indicatorClassName}
                    label={connectPresentation.label}
                  />
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
                <Button onClick={handleCopyCode} size="sm" variant="outline">
                  <IconCopy data-icon="inline-start" />
                  Copy code
                </Button>
                <Button onClick={handleCopyShareLink} size="sm">
                  <IconLink data-icon="inline-start" />
                  Copy share link
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-border/60 py-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="creator-code">Creator code</FieldLabel>
                <Input
                  id="creator-code"
                  readOnly
                  value={dashboard.creatorAccount.code}
                />
                <FieldDescription>
                  Share the short code or the full pricing link. Attribution
                  stays server-trusted through sign-up and checkout.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="creator-link">Share path</FieldLabel>
                <Input id="creator-link" readOnly value={sharePath} />
                <FieldDescription>
                  The copied share URL uses the current site origin together
                  with this path.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <div className="grid gap-0 border-y border-border/60 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  detail:
                    "Applied automatically on eligible first-month checkout.",
                  icon: IconCircleCheck,
                  label: "Configured discount",
                  value: programSummary.discount,
                },
                {
                  detail: dashboard.creatorAccount.payoutEligible
                    ? "Admin-configured payout rule for paid creator conversions."
                    : "Payout eligibility is currently paused on this profile.",
                  icon: IconShieldCheck,
                  label: "Configured payout",
                  value: programSummary.payout,
                },
                {
                  detail: "Users attributed to this creator code.",
                  icon: IconPlugConnected,
                  label: "Attributed signups",
                  value: String(dashboard.signupCount),
                },
                {
                  detail: estimatedPayout.detail,
                  icon: IconArrowRight,
                  label: "Paid conversions",
                  value: String(dashboard.paidConversionCount),
                },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className="flex min-h-28 flex-col gap-3 border-b border-border/60 px-0 py-4 sm:px-4 xl:border-r xl:border-b-0 xl:px-5"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="size-4" />
                      {item.label}
                    </div>
                    <div className="text-base font-semibold text-foreground">
                      {item.value}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60">
          <div className="py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="text-lg font-semibold tracking-tight text-foreground">
                  Stripe Connect
                </div>
                <CreatorConnectStatusLine
                  description={connectPresentation.description}
                  indicatorClassName={connectPresentation.indicatorClassName}
                  label={connectPresentation.label}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/creator/connect/start">
                    <IconExternalLink data-icon="inline-start" />
                    {connectActionLabel}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/creator/connect/return?source=manual">
                    <IconRefresh data-icon="inline-start" />
                    Refresh status
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-border/60 py-5">
            {dashboard.creatorAccount.requirementsDisabledReason ? (
              <Alert>
                <AlertTitle>Stripe paused payouts</AlertTitle>
                <AlertDescription>
                  {formatCreatorRequirementLabel(
                    dashboard.creatorAccount.requirementsDisabledReason
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="grid gap-5 border-b border-border/60 pb-5 xl:border-r xl:border-b-0 xl:pr-6 xl:pb-0">
                <div className="grid gap-3 text-sm">
                  <div className="text-sm font-medium text-foreground">
                    Account state
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">
                        {dashboard.creatorAccount.country}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Details submitted
                      </span>
                      <span className="font-medium">
                        {dashboard.creatorAccount.detailsSubmitted === null
                          ? "Not started"
                          : dashboard.creatorAccount.detailsSubmitted
                            ? "Yes"
                            : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Payouts enabled
                      </span>
                      <span className="font-medium">
                        {dashboard.creatorAccount.payoutsEnabled === null
                          ? "Not yet"
                          : dashboard.creatorAccount.payoutsEnabled
                            ? "Yes"
                            : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Payout eligibility
                      </span>
                      <span className="font-medium">
                        {dashboard.creatorAccount.payoutEligible
                          ? "Configured"
                          : "Paused"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Last sync</span>
                      <span className="font-medium">
                        {formatDateTime(
                          dashboard.creatorAccount.connectStatusUpdatedAt
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="font-medium text-foreground">
                    What happens next
                  </div>
                  <p className="text-muted-foreground">
                    Creator codes can stay active before payouts are ready.
                    Stripe Connect only governs payout setup, reviews, and
                    payout availability.
                  </p>
                  <p className="text-muted-foreground">
                    Estimated payout status: {estimatedPayout.value}.{" "}
                    {estimatedPayout.detail}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <CreatorRequirementList
                  emptyLabel="No details are currently due from you."
                  requirements={
                    dashboard.creatorAccount.requirementsCurrentlyDue
                  }
                  title="Currently due"
                />
                <CreatorRequirementList
                  emptyLabel="No past-due Stripe requirements are recorded."
                  requirements={dashboard.creatorAccount.requirementsPastDue}
                  title="Past due"
                />
                <CreatorRequirementList
                  emptyLabel="Stripe is not holding any submitted items in review."
                  requirements={
                    dashboard.creatorAccount.requirementsPendingVerification
                  }
                  title="In review"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
