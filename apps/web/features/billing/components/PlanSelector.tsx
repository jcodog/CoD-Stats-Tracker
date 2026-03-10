"use client"

import {
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { RadioGroup } from "@workspace/ui/components/radio-group"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { PricingPlanCard } from "@/features/billing/components/PricingPlanCard"
import type {
  BillingInterval,
  PricingCatalogPlan,
} from "@/features/billing/lib/billing-types"

export function PlanSelector(args: {
  interval: BillingInterval
  onIntervalChange: (interval: BillingInterval) => void
  onSelectPlan: (planKey: string) => void
  plans: PricingCatalogPlan[]
  selectedPlanKey: string
}) {
  function renderPlanOptions(interval: BillingInterval) {
    return (
      <RadioGroup
        className="grid gap-4 lg:grid-cols-2"
        onValueChange={args.onSelectPlan}
        value={args.selectedPlanKey}
      >
        {args.plans.map((plan) => (
          <PricingPlanCard
            inputId={`billing-plan-${interval}-${plan.planKey}`}
            interval={interval}
            key={`${interval}-${plan.planKey}`}
            plan={plan}
            selected={args.selectedPlanKey === plan.planKey}
          />
        ))}
      </RadioGroup>
    )
  }

  return (
    <FieldSet className="gap-5">
      <FieldLegend className="sr-only">Choose a billing plan</FieldLegend>
      <Tabs
        className="gap-5"
        onValueChange={(value) => {
          if (value === "month" || value === "year") {
            args.onIntervalChange(value)
          }
        }}
        value={args.interval}
      >
        <TabsList>
          <TabsTrigger value="month">Monthly</TabsTrigger>
          <TabsTrigger value="year">Yearly</TabsTrigger>
        </TabsList>
        <TabsContent value="month">{renderPlanOptions("month")}</TabsContent>
        <TabsContent value="year">{renderPlanOptions("year")}</TabsContent>
      </Tabs>
    </FieldSet>
  )
}
