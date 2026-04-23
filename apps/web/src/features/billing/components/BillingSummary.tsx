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

  if (args.variant === "checkout") {
    return (
      <div className="rounded-[15px] border border-border/70 bg-muted/20 p-px shadow-sm">
        <div className="flex flex-col rounded-[14px] bg-background/80">
          <div className="rounded-t-[14px] rounded-b-[11px] bg-card/95 px-5 py-5 shadow-[0_1px_0_rgba(255,255,255,0.03),0_12px_24px_-18px_rgba(0,0,0,0.72)]">
            <div className="grid gap-5">
              <div className="space-y-2">
                <CardTitle>{args.title ?? "Order summary"}</CardTitle>
                <CardDescription>
                  {args.description ??
                    "Review the selected plan before confirming billing."}
                </CardDescription>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-h-23 min-w-0 space-y-1">
                  <div className="text-lg font-semibold">{args.plan.name}</div>
                  <div className="line-clamp-3 text-sm text-muted-foreground">
                    {args.plan.description}
                  </div>
                </div>
                <Badge variant="outline">{args.interval}</Badge>
              </div>
            </div>
          </div>

          {args.footer ? (
            <div className="px-5 pt-4 pb-4">
              <div className="flex flex-col gap-4">
                <div className="flex w-full items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Order total</span>
                  <span className="text-base font-semibold">
                    {summaryTotal}
                  </span>
                </div>
                {args.footer}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardHeader className={cn("pb-4")}>
        <CardTitle>{args.title ?? "Order summary"}</CardTitle>
        <CardDescription>
          {args.description ??
            "Review the selected plan before confirming billing."}
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
