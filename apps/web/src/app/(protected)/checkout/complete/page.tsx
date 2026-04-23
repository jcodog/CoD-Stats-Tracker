import Link from "next/link"

import { createPageMetadata } from "@/lib/metadata/page"
import { Button } from "@workspace/ui/components/button"

export const metadata = createPageMetadata("Checkout Complete")

export default function CheckoutCompletePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
      <div className="w-full rounded-xl border border-border/70 bg-card px-6 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment submitted
          </h1>
          <p className="text-sm text-muted-foreground">
            Stripe has the confirmation. Billing access and the final
            subscription state still reconcile through webhooks before they
            appear in billing.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/settings/billing">Open billing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
