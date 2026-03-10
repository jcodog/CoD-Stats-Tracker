"use client"

import { Badge } from "@workspace/ui/components/badge"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field"
import { RadioGroupItem } from "@workspace/ui/components/radio-group"
import { cn } from "@workspace/ui/lib/utils"

import type {
  BillingInterval,
  PricingCatalogPlan,
} from "@/features/billing/lib/billing-types"
import { formatCurrencyAmount } from "@/features/billing/lib/format"

function getRelationshipLabel(plan: PricingCatalogPlan) {
  switch (plan.relationship) {
    case "current":
      return "Current"
    case "upgrade":
      return "Upgrade"
    case "downgrade":
      return "Downgrade"
    case "switch":
      return "Switch"
    default:
      return "Available"
  }
}

export function PricingPlanCard(args: {
  inputId: string
  interval: BillingInterval
  plan: PricingCatalogPlan
  selected?: boolean
}) {
  const price =
    args.interval === "year" ? args.plan.pricing.year : args.plan.pricing.month
  const visibleFeatures = args.plan.features.slice(0, 6)
  const hiddenFeatureCount = Math.max(args.plan.features.length - visibleFeatures.length, 0)

  return (
    <FieldLabel
      className={cn(
        "rounded-xl bg-card/80 transition-colors hover:bg-card",
        args.selected && "border-primary/35 bg-primary/6"
      )}
      htmlFor={args.inputId}
    >
      <Field className="gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <FieldContent className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <FieldTitle className="text-base font-semibold">
                {args.plan.name}
              </FieldTitle>
              <Badge variant={args.selected ? "secondary" : "outline"}>
                {getRelationshipLabel(args.plan)}
              </Badge>
            </div>
            <FieldDescription>{args.plan.description}</FieldDescription>
          </FieldContent>
          <RadioGroupItem
            aria-label={`Select ${args.plan.name}`}
            id={args.inputId}
            value={args.plan.planKey}
          />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight">
              {price ? formatCurrencyAmount(price.amount, price.currency) : "Free"}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              / {args.interval}
            </span>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {args.interval === "year" ? "Billed once yearly" : "Renews monthly"}
          </div>
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
          {hiddenFeatureCount > 0 ? (
            <div className="text-sm text-muted-foreground">
              +{hiddenFeatureCount} more feature{hiddenFeatureCount === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      </Field>
    </FieldLabel>
  )
}
