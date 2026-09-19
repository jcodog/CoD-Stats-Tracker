"use client"

import Link from "next/link"
import {
  IconExternalLink,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { buttonVariants, Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "sonner"

import {
  BillingClientError,
  useBillingCenter,
  useBillingState,
  useCreateBillingPortalSession,
  useSyncBillingCenter,
} from "@/features/billing/lib/billing-client"
import type {
  BillingCenterSubscription,
  BillingResolvedState,
} from "@/features/billing/lib/billing-types"
import {
  formatBillingInterval,
  formatBillingStatusLabel,
  formatCurrencyAmount,
  formatDateLabel,
  formatDateTimeLabel,
} from "@/features/billing/lib/format"

function getPrimarySubscription(
  subscriptions: BillingCenterSubscription[]
): BillingCenterSubscription | null {
  return subscriptions[0] ?? null
}

function getSubscriptionAmountLabel(
  subscription: BillingCenterSubscription | null
) {
  if (!subscription) {
    return "No active Payment and renewal"
  }

  if (subscription.amount === null || !subscription.currency) {
    return "Stripe-managed billing"
  }

  const totalAmount = subscription.amount * Math.max(subscription.quantity, 1)
  return `${formatCurrencyAmount(totalAmount, subscription.currency)} / ${formatBillingInterval(subscription.billingInterval)}`
}

function getSubscriptionPeriodLabel(
  subscription: BillingCenterSubscription | null
) {
  if (!subscription) {
    return "Start checkout from the plan page when you are ready."
  }

  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return `Ends ${formatDateLabel(subscription.currentPeriodEnd)}`
  }

  if (subscription.currentPeriodEnd) {
    return `Renews ${formatDateLabel(subscription.currentPeriodEnd)}`
  }

  return "Stripe will confirm renewal timing."
}

function getCreatorGrantLabel(state: BillingResolvedState | null | undefined) {
  if (
    state?.accessSource !== "creator_grant" &&
    state?.accessSource !== "managed_grant_subscription"
  ) {
    return "No active complimentary Creator grant"
  }

  const endsAt =
    state.creatorGrant?.endsAt ?? state.subscription?.managedGrantEndsAt

  return endsAt
    ? `Active until ${formatDateLabel(endsAt)}`
    : "Active with no expiry"
}

function StateRow(args: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-border/60 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-4">
      <div className="text-sm text-muted-foreground">{args.label}</div>
      <div className="text-sm font-medium break-words text-foreground">
        {args.value}
      </div>
    </div>
  )
}

export function BillingSettingsView({
  checkoutEnabled,
}: {
  checkoutEnabled: boolean
}) {
  const billingCenterQuery = useBillingCenter()
  const billingStateQuery = useBillingState()
  const syncBillingCenter = useSyncBillingCenter()
  const createPortalSession = useCreateBillingPortalSession()

  async function handleRefresh() {
    try {
      await syncBillingCenter.mutateAsync()
      toast.success("Billing data refreshed.")
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to refresh billing data."
      )
    }
  }

  async function handleOpenPortal() {
    try {
      const session = await createPortalSession.mutateAsync()
      window.location.assign(session.portalUrl)
    } catch (error) {
      toast.error(
        error instanceof BillingClientError
          ? error.message
          : "Unable to open Stripe Customer Portal."
      )
    }
  }

  if (billingCenterQuery.isPending || billingStateQuery.isPending) {
    return (
      <div className={"max-md:grid max-md:gap-5 md:grid md:gap-6"}>
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (billingCenterQuery.isError || billingStateQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Billing failed to load</AlertTitle>
        <AlertDescription>
          The billing center could not load the current Stripe-backed account
          state.
        </AlertDescription>
      </Alert>
    )
  }

  const billingCenter = billingCenterQuery.data
  const billingState = billingStateQuery.data
  const primarySubscription = getPrimarySubscription(
    billingCenter?.subscriptions ?? []
  )

  if (!billingCenter) {
    return (
      <Alert>
        <AlertTitle>Billing unavailable</AlertTitle>
        <AlertDescription>
          Billing data is not available for this account yet.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={"mx-auto flex w-full max-w-5xl flex-col gap-6"}>
      <div
        className={
          "max-md:grid max-md:gap-3 md:flex md:flex-col md:gap-4 md:lg:flex-row md:lg:items-start md:lg:justify-between"
        }
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Stripe Customer Portal manages payment methods, invoices,
            cancellation, reactivation, plan changes, and billing details.
          </p>
        </div>
        <div
          className={
            "max-md:grid max-md:gap-2 md:flex md:flex-col md:items-start md:gap-2 md:lg:items-end"
          }
        >
          <div className="text-sm text-muted-foreground">
            Last synced {formatDateTimeLabel(billingCenter.lastSyncedAt)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={syncBillingCenter.isPending}
              onClick={() => void handleRefresh()}
              variant="outline"
            >
              <IconRefresh data-icon="inline-start" />
              {syncBillingCenter.isPending ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              disabled={createPortalSession.isPending}
              onClick={() => void handleOpenPortal()}
            >
              <IconExternalLink data-icon="inline-start" />
              {createPortalSession.isPending
                ? "Opening Stripe..."
                : "Manage billing in Stripe"}
            </Button>
          </div>
        </div>
      </div>

      <section className="border-y border-border/70">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-border/60 py-5 md:border-r md:border-b-0 md:pr-6">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <IconShieldCheck className="size-5" />
              Your plan and access
            </div>
            <div className="mt-4">
              <StateRow
                label="Current plan"
                value={billingState?.effectivePlan?.name ?? "Free"}
              />
              <StateRow
                label="Subscription status"
                value={
                  primarySubscription
                    ? formatBillingStatusLabel(primarySubscription.status)
                    : "No paid subscription"
                }
              />
              <StateRow
                label="Creator grant"
                value={getCreatorGrantLabel(billingState)}
              />
              <StateRow
                label="Billing profile"
                value={
                  billingCenter.billingProfile.stripeCustomerId
                    ? (billingCenter.billingProfile.email ??
                      billingCenter.billingProfile.stripeCustomerId)
                    : "Stripe customer will be created when needed"
                }
              />
            </div>
          </div>

          <div className="py-5 md:pl-6">
            <div className="text-lg font-semibold tracking-tight">
              Payment and renewal
            </div>
            <div className="mt-4">
              <StateRow
                label="Plan"
                value={primarySubscription?.productName ?? "None"}
              />
              <StateRow
                label="Amount"
                value={getSubscriptionAmountLabel(primarySubscription)}
              />
              <StateRow
                label="Period"
                value={getSubscriptionPeriodLabel(primarySubscription)}
              />
              <StateRow
                label="Attention state"
                value={
                  primarySubscription
                    ? formatBillingStatusLabel(
                        primarySubscription.attentionStatus
                      )
                    : "None"
                }
              />
            </div>
          </div>
        </div>
      </section>

      <Alert>
        <AlertTitle>Stripe-hosted billing management</AlertTitle>
        <AlertDescription>
          Use Stripe Customer Portal for subscription changes and billing
          details. This page only reflects the latest app-side sync state.
        </AlertDescription>
      </Alert>

      {!primarySubscription && checkoutEnabled ? (
        <div>
          <Link
            href="/settings/billing/plan"
            className={buttonVariants({ variant: "outline" })}
          >
            View plans
          </Link>
        </div>
      ) : null}
    </div>
  )
}
