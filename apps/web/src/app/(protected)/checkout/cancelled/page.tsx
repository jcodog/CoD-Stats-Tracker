import Link from "next/link"

import { createPageMetadata } from "@/lib/metadata/page"
import { buttonVariants } from "@workspace/ui/components/button"

export const metadata = createPageMetadata("Checkout Cancelled")

export default function CheckoutCancelledPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
      <div className="w-full rounded-xl border border-border/70 bg-card px-6 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Checkout cancelled
          </h1>
          <p className="text-sm text-muted-foreground">
            No billing change was finalized. Return to plans to pick another
            option or review your current billing state from billing settings.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/settings/billing/plan" className={buttonVariants({})}>
            Back to plans
          </Link>
          <Link
            href="/settings/billing"
            className={buttonVariants({ variant: "outline" })}
          >
            Open billing
          </Link>
        </div>
      </div>
    </section>
  )
}
