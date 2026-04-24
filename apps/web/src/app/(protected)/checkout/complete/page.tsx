import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { fetchAction } from "convex/nextjs"

import { api } from "@workspace/backend/convex/_generated/api"
import { Button } from "@workspace/ui/components/button"

import type { CheckoutSessionSyncResult } from "@/features/billing/lib/billing-types"
import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Checkout Complete")

function getCompletionCopy(result: {
  paymentStatus: "no_payment_required" | "paid" | "unpaid" | null
  status: "complete" | "expired" | "open"
  synced: boolean
} | null) {
  if (!result) {
    return {
      description:
        "Stripe has the confirmation. Billing will finish reconciling as soon as the latest session state is available.",
      title: "Payment submitted",
    }
  }

  if (result.status === "expired") {
    return {
      description:
        "This Checkout Session expired before payment completed. Start a fresh checkout from the upgrade page.",
      title: "Checkout expired",
    }
  }

  if (result.status === "open") {
    return {
      description:
        "Stripe returned you to the app before payment fully closed. Reopen checkout if you still need to finish payment.",
      title: "Checkout still open",
    }
  }

  if (result.paymentStatus === "paid") {
    return {
      description: result.synced
        ? "Your subscription is confirmed and the latest billing state has been synced into the app."
        : "Stripe confirmed payment. Billing state will appear as soon as the final sync completes.",
      title: "Subscription confirmed",
    }
  }

  return {
    description:
      "Stripe finished the Checkout Session, but billing access still needs the final payment state. Refresh billing if it does not update shortly.",
    title: "Checkout completed",
  }
}

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string | string[]
  }>
}) {
  const resolvedSearchParams = await searchParams
  const sessionId =
    typeof resolvedSearchParams.session_id === "string"
      ? resolvedSearchParams.session_id.trim()
      : ""
  const { getToken } = await auth()
  const token = await getToken({ template: "convex" }).catch(() => null)

  let completionResult: CheckoutSessionSyncResult | null = null
  let completionError: string | null = null

  if (sessionId && token) {
    try {
      completionResult = await fetchAction(
        api.actions.billing.customer.syncCheckoutSessionCompletion,
        {
          sessionId,
        },
        {
          token,
        }
      )
    } catch (error) {
      completionError =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "Unable to refresh billing from the completed Checkout Session."
    }
  }

  const copy = getCompletionCopy(completionResult)

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
      <div className="w-full border border-border/70 bg-background px-6 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          {completionResult?.planKey ? (
            <p className="text-sm text-muted-foreground">
              Plan: <span className="font-medium text-foreground">{completionResult.planKey}</span>
            </p>
          ) : null}
          {completionError ? (
            <p className="text-sm text-destructive">{completionError}</p>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/settings/billing">Open billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/billing/plan">Back to plans</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
