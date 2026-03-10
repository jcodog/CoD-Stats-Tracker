"use client"

import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import type { PricingCatalogPlan } from "@/features/billing/lib/billing-types"
import { formatCurrencyAmount } from "@/features/billing/lib/format"

export function BillingSummary(args: {
  description?: string
  footer?: React.ReactNode
  interval: "month" | "year"
  plan: PricingCatalogPlan
  title?: string
  variant?: "checkout" | "default"
}) {
  const price =
    args.interval === "year" ? args.plan.pricing.year : args.plan.pricing.month
  const summaryTotal = price
    ? `${formatCurrencyAmount(price.amount, price.currency)} / ${args.interval}`
    : "Free"
  const visibleFeatures = args.plan.features.slice(0, 6)

  if (args.variant === "checkout") {
    return (
      <div className="relative">
        <div className="relative z-10 rounded-xl border border-border/70 bg-card px-6 py-6 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <CardTitle>{args.title ?? "Order summary"}</CardTitle>
              <CardDescription>
                {args.description ?? "Review the selected plan before confirming billing."}
              </CardDescription>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-lg font-semibold">{args.plan.name}</div>
                <div className="text-sm text-muted-foreground">
                  {args.plan.description}
                </div>
              </div>
              <Badge variant="outline">{args.interval}</Badge>
            </div>
            <div className="grid gap-2 border-t border-border/70 pt-4 sm:grid-cols-2">
              {visibleFeatures.map((feature) => (
                <div
                  className="flex items-start gap-2 text-sm text-foreground/90"
                  key={feature.featureKey}
                >
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary" />
                  <span>{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {args.footer ? (
          <div className="-mt-3 rounded-b-xl border border-border/70 bg-muted/35 px-6 pb-5 pt-7">
            <div className="flex flex-col gap-4">
              <div className="flex w-full items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Order total</span>
                <span className="text-base font-semibold">{summaryTotal}</span>
              </div>
              {args.footer}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardHeader className={cn("pb-4")}>
        <CardTitle>{args.title ?? "Order summary"}</CardTitle>
        <CardDescription>
          {args.description ?? "Review the selected plan before confirming billing."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-lg font-semibold">{args.plan.name}</div>
            <div className="text-sm text-muted-foreground">
              {args.plan.description}
            </div>
          </div>
          <Badge variant="outline">{args.interval}</Badge>
        </div>

        {args.variant === "default" ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plan total</span>
            <span className="font-medium">{summaryTotal}</span>
          </div>
        ) : null}

        <div className="grid gap-2 border-t border-border/70 pt-4 sm:grid-cols-2">
          {visibleFeatures.map((feature) => (
            <div
              className="flex items-start gap-2 text-sm text-foreground/90"
              key={feature.featureKey}
            >
              <span className="mt-1.5 size-1.5 rounded-full bg-primary" />
              <span>{feature.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
      {args.footer ? (
        <CardFooter className="flex flex-col gap-4 border-t border-border/70 bg-muted/35 px-6 py-5">
          <div className="flex w-full items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Order total</span>
            <span className="text-base font-semibold">{summaryTotal}</span>
          </div>
          {args.footer}
        </CardFooter>
      ) : null}
    </Card>
  )
}
