"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import type { BillingResolvedState } from "@/features/billing/lib/billing-types"
import { formatDateLabel } from "@/features/billing/lib/format"

export function CurrentPlanCard(args: {
  onCancel?: () => void
  onReactivate?: () => void
  state: BillingResolvedState
}) {
  const effectivePlanName =
    args.state.effectivePlan?.name ?? args.state.effectivePlanKey ?? "Free"

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{effectivePlanName}</CardTitle>
            <CardDescription>
              Access source: {args.state.accessSource.replaceAll("_", " ")}
            </CardDescription>
          </div>
          <Badge
            variant={
              args.state.attentionStatus === "none" ? "secondary" : "destructive"
            }
          >
            {args.state.attentionStatus === "none"
              ? "Healthy"
              : args.state.attentionStatus.replaceAll("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Billing interval</span>
          <span className="font-medium">
            {args.state.subscription?.interval ?? "Not billed"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Current period ends</span>
          <span className="font-medium">
            {formatDateLabel(args.state.subscription?.currentPeriodEnd)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Scheduled change</span>
          <span className="font-medium">
            {args.state.upcomingChange
              ? `${args.state.upcomingChange.type.replaceAll("_", " ")} on ${formatDateLabel(args.state.upcomingChange.effectiveAt)}`
              : "None"}
          </span>
        </div>
      </CardContent>
      {args.state.subscription ? (
        <CardFooter className="gap-3">
          {args.state.subscription.cancelAtPeriodEnd ? (
            <Button onClick={args.onReactivate} variant="outline">
              Keep subscription
            </Button>
          ) : (
            <Button onClick={args.onCancel} variant="outline">
              Cancel at period end
            </Button>
          )}
        </CardFooter>
      ) : null}
    </Card>
  )
}
