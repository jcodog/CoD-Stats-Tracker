import Stripe from "stripe"

import { internal } from "../_generated/api"
import {
  deriveAttentionStatus,
  getExpandedStripeCustomer,
  getInvoicePaymentIntentId,
  getStripeInvoiceId,
  getStripePaymentIntentId,
  getStripeProductId,
  getStripeScheduleId,
  getSubscriptionItemCurrentPeriodEnd,
  getSubscriptionItemCurrentPeriodStart,
  getStripeSubscriptionInterval,
  getStripeSubscriptionItem,
  mapStripeSubscriptionStatus,
  mapSubscriptionScheduleChange,
} from "./billingStripe"

type BillingLifecycleCtx = {
  runMutation: (reference: any, args: any) => Promise<any>
  runQuery: (reference: any, args: any) => Promise<any>
}

async function getStripeCustomerIfAvailable(args: {
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined
  stripe: Stripe
}) {
  const expandedCustomer = getExpandedStripeCustomer(args.customer)

  if (expandedCustomer) {
    return expandedCustomer
  }

  if (!args.customer || typeof args.customer !== "string") {
    return null
  }

  const customer = await args.stripe.customers.retrieve(args.customer)

  if ("deleted" in customer && customer.deleted) {
    return null
  }

  return customer
}

export async function reconcileBillingCustomer(args: {
  active?: boolean
  ctx: BillingLifecycleCtx
  stripe: Stripe
  stripeCustomerId: string
}) {
  const billingContext = await args.ctx.runQuery(
    internal.queries.billing.internal.getBillingContextByStripeCustomerId,
    {
      stripeCustomerId: args.stripeCustomerId,
    }
  )

  if (!billingContext) {
    return null
  }

  const stripeCustomer = await getStripeCustomerIfAvailable({
    customer: args.stripeCustomerId,
    stripe: args.stripe,
  })

  await args.ctx.runMutation(
    internal.mutations.billing.state.upsertBillingCustomer,
    {
      active: args.active ?? billingContext.customer?.active ?? true,
      clerkUserId: billingContext.user.clerkUserId,
      email:
        stripeCustomer?.email ??
        billingContext.customer?.email ??
        undefined,
      name:
        stripeCustomer?.name ??
        billingContext.customer?.name ??
        billingContext.user.name,
      stripeCustomerId: args.stripeCustomerId,
      userId: billingContext.user._id,
    }
  )

  return {
    billingContext,
    stripeCustomer,
  }
}

export async function reconcileStripeSubscription(args: {
  ctx: BillingLifecycleCtx
  invoiceEventType?:
    | "invoice.payment_action_required"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
  lastStripeEventId?: string
  stripe: Stripe
  subscription: Stripe.Subscription
}) {
  const stripeCustomerId =
    typeof args.subscription.customer === "string"
      ? args.subscription.customer
      : args.subscription.customer.id
  const billingContext = await args.ctx.runQuery(
    internal.queries.billing.internal.getBillingContextByStripeCustomerId,
    {
      stripeCustomerId,
    }
  )

  if (!billingContext) {
    return null
  }

  const item = getStripeSubscriptionItem(args.subscription)
  const priceId = item.price.id
  const plan = await args.ctx.runQuery(
    internal.queries.billing.internal.getPlanByStripePriceId,
    {
      stripePriceId: priceId,
    }
  )

  if (!plan) {
    throw new Error(
      `Billing plan not found for Stripe price ${priceId} on subscription ${args.subscription.id}.`
    )
  }

  const stripeCustomer = await getStripeCustomerIfAvailable({
    customer: args.subscription.customer,
    stripe: args.stripe,
  })

  await args.ctx.runMutation(
    internal.mutations.billing.state.upsertBillingCustomer,
    {
      active: true,
      clerkUserId: billingContext.user.clerkUserId,
      email:
        stripeCustomer?.email ??
        billingContext.customer?.email ??
        undefined,
      name:
        stripeCustomer?.name ??
        billingContext.customer?.name ??
        billingContext.user.name,
      stripeCustomerId,
      userId: billingContext.user._id,
    }
  )

  const scheduleId = getStripeScheduleId(args.subscription.schedule)
  const schedule = scheduleId
    ? await args.stripe.subscriptionSchedules.retrieve(scheduleId)
    : null
  const priceIdToPlan = new Map<string, { interval: "month" | "year"; planKey: string }>()
  const plans = await args.ctx.runQuery(
    internal.queries.billing.catalog.getBillingPlans,
    {}
  )

  for (const currentPlan of plans) {
    if (currentPlan.monthlyPriceId) {
      priceIdToPlan.set(currentPlan.monthlyPriceId, {
        interval: "month",
        planKey: currentPlan.key,
      })
    }

    if (currentPlan.yearlyPriceId) {
      priceIdToPlan.set(currentPlan.yearlyPriceId, {
        interval: "year",
        planKey: currentPlan.key,
      })
    }
  }

  const scheduledChange = mapSubscriptionScheduleChange({
    priceIdToPlan,
    schedule,
    subscription: args.subscription,
  })

  await args.ctx.runMutation(
    internal.mutations.billing.state.upsertBillingSubscription,
    {
      attentionStatus: deriveAttentionStatus({
        invoiceEventType: args.invoiceEventType,
        subscription: args.subscription,
      }),
      attentionUpdatedAt: Date.now(),
      cancelAt:
        typeof args.subscription.cancel_at === "number"
          ? args.subscription.cancel_at * 1000
          : undefined,
      cancelAtPeriodEnd: args.subscription.cancel_at_period_end,
      canceledAt:
        typeof args.subscription.canceled_at === "number"
          ? args.subscription.canceled_at * 1000
          : undefined,
      clerkUserId: billingContext.user.clerkUserId,
      clearScheduledChange:
        scheduledChange.scheduledChangeType === undefined &&
        !args.subscription.cancel_at_period_end,
      currentPeriodEnd: getSubscriptionItemCurrentPeriodEnd(args.subscription),
      currentPeriodStart: getSubscriptionItemCurrentPeriodStart(args.subscription),
      endedAt:
        typeof args.subscription.ended_at === "number"
          ? args.subscription.ended_at * 1000
          : undefined,
      interval: getStripeSubscriptionInterval(args.subscription),
      lastStripeEventId: args.lastStripeEventId,
      planKey: plan.key,
      scheduledChangeAt: scheduledChange.scheduledChangeAt,
      scheduledChangeRequestedAt: scheduledChange.scheduledChangeRequestedAt,
      scheduledChangeType: scheduledChange.scheduledChangeType,
      scheduledInterval: scheduledChange.scheduledInterval,
      scheduledPlanKey: scheduledChange.scheduledPlanKey,
      status: mapStripeSubscriptionStatus(args.subscription.status),
      stripeCustomerId,
      stripeLatestInvoiceId: getStripeInvoiceId(args.subscription.latest_invoice),
      stripeLatestPaymentIntentId: getInvoicePaymentIntentId(
        args.subscription.latest_invoice
      ),
      stripePriceId: priceId,
      stripeProductId: getStripeProductId(item.price.product),
      stripeScheduleId: scheduledChange.stripeScheduleId ?? scheduleId,
      stripeSubscriptionId: args.subscription.id,
      stripeSubscriptionItemId: item.id,
      userId: billingContext.user._id,
    }
  )

  return {
    planKey: plan.key,
    status: args.subscription.status,
    stripeCustomerId,
    subscriptionId: args.subscription.id,
  }
}

export async function reconcileStripeInvoice(args: {
  ctx: BillingLifecycleCtx
  eventType:
    | "invoice.payment_action_required"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
  invoice: Stripe.Invoice
  lastStripeEventId?: string
  stripe: Stripe
}) {
  const stripeCustomerId =
    typeof args.invoice.customer === "string" ? args.invoice.customer : undefined
  const stripeSubscriptionId =
    args.invoice.parent?.type === "subscription_details" &&
    typeof args.invoice.parent.subscription_details?.subscription === "string"
      ? args.invoice.parent.subscription_details.subscription
      : undefined

  if (stripeCustomerId) {
    await reconcileBillingCustomer({
      active: true,
      ctx: args.ctx,
      stripe: args.stripe,
      stripeCustomerId,
    })
  }

  if (!stripeSubscriptionId) {
    return null
  }

  const subscription = await args.stripe.subscriptions.retrieve(
    stripeSubscriptionId,
    {
      expand: [
        "customer",
        "items.data.price.product",
        "latest_invoice.confirmation_secret",
        "latest_invoice.payment_intent",
        "pending_setup_intent",
        "schedule",
      ],
    }
  )

  return await reconcileStripeSubscription({
    ctx: args.ctx,
    invoiceEventType: args.eventType,
    lastStripeEventId: args.lastStripeEventId,
    stripe: args.stripe,
    subscription,
  })
}
