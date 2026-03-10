"use node"

import Stripe from "stripe"
import { v } from "convex/values"

import type { Doc } from "../../_generated/dataModel"
import { internal } from "../../_generated/api"
import { action, type ActionCtx } from "../../_generated/server"
import { reconcileStripeSubscription } from "../../lib/billingLifecycle"
import {
  getInvoiceConfirmationSecret,
  getSetupIntentClientSecret,
  getStripeScheduleId,
  getStripeSubscriptionInterval,
  getStripeSubscriptionItem,
  getSubscriptionItemCurrentPeriodEnd,
} from "../../lib/billingStripe"
import { getClerkBackendClient } from "../../lib/clerk"
import { getStripe, STRIPE_CATALOG_APP } from "../../lib/stripe"

type BillingPlanRecord = Doc<"billingPlans">
type PublicActionCtx = ActionCtx

const billingIntervalValidator = v.union(v.literal("month"), v.literal("year"))

class BillingActionError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

function getStripeStatusPriority(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return 7
    case "trialing":
      return 6
    case "past_due":
      return 5
    case "paused":
      return 4
    case "incomplete":
      return 3
    case "unpaid":
      return 2
    case "canceled":
      return 1
    case "incomplete_expired":
      return 0
  }
}

function sanitizeBillingError(error: unknown) {
  if (error instanceof BillingActionError) {
    return error
  }

  if (error instanceof Stripe.errors.StripeError) {
    return new BillingActionError(
      error.code ?? "stripe_error",
      error.message || "Billing request failed.",
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 502
    )
  }

  return new BillingActionError(
    "billing_error",
    error instanceof Error ? error.message : "Billing request failed.",
    500
  )
}

async function requireBillingUser(ctx: PublicActionCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new BillingActionError(
      "unauthenticated",
      "You must be signed in to manage billing.",
      401
    )
  }

  const billingContext = await ctx.runQuery(
    internal.queries.billing.internal.getUserBillingContextByClerkUserId,
    {
      clerkUserId: identity.subject,
    }
  )

  if (!billingContext) {
    throw new BillingActionError(
      "missing_user",
      "Your billing account could not be found.",
      404
    )
  }

  const clerkUser = await getClerkBackendClient().users.getUser(identity.subject)
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    billingContext.customer?.email ??
    undefined
  const actorName =
    [clerkUser.firstName?.trim(), clerkUser.lastName?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    clerkUser.username?.trim() ||
    billingContext.user.name

  return {
    ...billingContext,
    actorName,
    email,
  }
}

async function assertCheckoutEnabled(ctx: PublicActionCtx) {
  const checkoutFlag = await ctx.runQuery(
    internal.queries.featureFlags.internal.getByKey,
    {
      key: "checkout",
    }
  )

  if (checkoutFlag && !checkoutFlag.enabled) {
    throw new BillingActionError(
      "checkout_disabled",
      "Checkout is currently unavailable.",
      403
    )
  }
}

async function recordBillingAuditLog(args: {
  action: string
  ctx: PublicActionCtx
  details?: string
  entityId: string
  entityLabel?: string
  result: "error" | "success" | "warning"
  summary: string
  user: Awaited<ReturnType<typeof requireBillingUser>>["user"]
  userName: string
}) {
  await args.ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
    action: args.action,
    actorClerkUserId: args.user.clerkUserId,
    actorName: args.userName,
    actorRole: args.user.role ?? "user",
    details: args.details,
    entityId: args.entityId,
    entityLabel: args.entityLabel,
    entityType: "billingCustomerAction",
    result: args.result,
    summary: args.summary,
  })
}

async function getPurchasablePlan(args: {
  ctx: PublicActionCtx
  interval: "month" | "year"
  planKey: string
}) {
  const plan = await args.ctx.runQuery(internal.queries.billing.internal.getPlanByKey, {
    planKey: args.planKey,
  })

  if (!plan || !plan.active || plan.archivedAt !== undefined) {
    throw new BillingActionError(
      "plan_unavailable",
      "That plan is not available for purchase.",
      404
    )
  }

  if (plan.planType !== "paid") {
    throw new BillingActionError(
      "plan_not_paid",
      "That plan cannot be purchased through Stripe.",
      400
    )
  }

  const priceId =
    args.interval === "month" ? plan.monthlyPriceId : plan.yearlyPriceId

  if (!priceId) {
    throw new BillingActionError(
      "missing_price",
      "That plan is missing Stripe pricing for the selected billing interval.",
      409
    )
  }

  return {
    plan,
    priceId,
  }
}

function getPlanAmount(plan: BillingPlanRecord, interval: "month" | "year") {
  return interval === "month" ? plan.monthlyPriceAmount : plan.yearlyPriceAmount
}

function getMonthlyEquivalentAmount(
  plan: BillingPlanRecord,
  interval: "month" | "year"
) {
  const amount = getPlanAmount(plan, interval)
  return interval === "year" ? amount / 12 : amount
}

function classifyPlanChange(args: {
  currentInterval: "month" | "year"
  currentPlan: BillingPlanRecord
  targetInterval: "month" | "year"
  targetPlan: BillingPlanRecord
}) {
  if (
    args.targetPlan.key === args.currentPlan.key &&
    args.targetInterval === args.currentInterval
  ) {
    return "noop" as const
  }

  if (args.targetPlan.sortOrder > args.currentPlan.sortOrder) {
    return "upgrade_now" as const
  }

  if (args.targetPlan.sortOrder < args.currentPlan.sortOrder) {
    return "downgrade_later" as const
  }

  const currentEquivalent = getMonthlyEquivalentAmount(
    args.currentPlan,
    args.currentInterval
  )
  const targetEquivalent = getMonthlyEquivalentAmount(
    args.targetPlan,
    args.targetInterval
  )

  if (targetEquivalent > currentEquivalent) {
    return "upgrade_now" as const
  }

  if (targetEquivalent < currentEquivalent) {
    return "switch_later" as const
  }

  return "switch_now" as const
}

async function ensureStripeCustomer(args: {
  ctx: PublicActionCtx
  email?: string
  stripe: Stripe
  userContext: Awaited<ReturnType<typeof requireBillingUser>>
}) {
  if (args.userContext.customer?.stripeCustomerId) {
    await args.ctx.runMutation(
      internal.mutations.billing.state.upsertBillingCustomer,
      {
        active: true,
        clerkUserId: args.userContext.user.clerkUserId,
        email: args.email ?? args.userContext.customer.email,
        name: args.userContext.actorName,
        stripeCustomerId: args.userContext.customer.stripeCustomerId,
        userId: args.userContext.user._id,
      }
    )

    return args.userContext.customer.stripeCustomerId
  }

  const customer = await args.stripe.customers.create({
    email: args.email,
    metadata: {
      app: STRIPE_CATALOG_APP,
      clerkUserId: args.userContext.user.clerkUserId,
      userId: args.userContext.user._id,
    },
    name: args.userContext.actorName,
  })

  await args.ctx.runMutation(internal.mutations.billing.state.upsertBillingCustomer, {
    active: true,
    clerkUserId: args.userContext.user.clerkUserId,
    email: args.email,
    name: args.userContext.actorName,
    stripeCustomerId: customer.id,
    userId: args.userContext.user._id,
  })

  return customer.id
}

async function getExistingStripeSubscription(args: {
  customerId: string
  stripe: Stripe
}) {
  const subscriptions = await args.stripe.subscriptions.list({
    customer: args.customerId,
    limit: 10,
    status: "all",
  })

  return (
    [...subscriptions.data]
      .sort((left, right) => {
        const priorityDifference =
          getStripeStatusPriority(right.status) - getStripeStatusPriority(left.status)

        if (priorityDifference !== 0) {
          return priorityDifference
        }

        return right.created - left.created
      })[0] ?? null
  )
}

async function getExpandedSubscription(args: {
  stripe: Stripe
  subscriptionId: string
}) {
  return await args.stripe.subscriptions.retrieve(args.subscriptionId, {
    expand: [
      "customer",
      "items.data.price.product",
      "latest_invoice.confirmation_secret",
      "latest_invoice.payment_intent",
      "pending_setup_intent",
      "schedule",
    ],
  })
}

function getConfirmationPayload(subscription: Stripe.Subscription) {
  const invoiceClientSecret = getInvoiceConfirmationSecret(
    subscription.latest_invoice
  )

  if (invoiceClientSecret) {
    return {
      clientSecret: invoiceClientSecret,
      secretType: "payment_intent" as const,
    }
  }

  const setupIntentClientSecret = getSetupIntentClientSecret(
    subscription.pending_setup_intent
  )

  if (setupIntentClientSecret) {
    return {
      clientSecret: setupIntentClientSecret,
      secretType: "setup_intent" as const,
    }
  }

  return {
    clientSecret: undefined,
    secretType: "none" as const,
  }
}

async function releaseExistingSchedule(subscription: Stripe.Subscription, stripe: Stripe) {
  const scheduleId = getStripeScheduleId(subscription.schedule)

  if (!scheduleId) {
    return
  }

  try {
    await stripe.subscriptionSchedules.release(scheduleId)
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      return
    }

    throw error
  }
}

function getInvoiceDescription(invoice: Stripe.Invoice) {
  return (
    invoice.lines.data[0]?.description ??
    invoice.description ??
    invoice.number ??
    "Subscription invoice"
  )
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return getSubscriptionItemCurrentPeriodEnd(subscription) ?? Date.now()
}

export const createSubscriptionIntent = action({
  args: {
    attemptKey: v.optional(v.string()),
    interval: billingIntervalValidator,
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await assertCheckoutEnabled(ctx)

      const userContext = await requireBillingUser(ctx)
      const stripe = getStripe()
      const { plan, priceId } = await getPurchasablePlan({
        ctx,
        interval: args.interval,
        planKey: args.planKey,
      })
      const customerId = await ensureStripeCustomer({
        ctx,
        email: userContext.email,
        stripe,
        userContext,
      })
      const existingSubscription = await getExistingStripeSubscription({
        customerId,
        stripe,
      })

      if (
        existingSubscription &&
        !["canceled", "incomplete_expired", "unpaid"].includes(existingSubscription.status)
      ) {
        const expandedSubscription = await getExpandedSubscription({
          stripe,
          subscriptionId: existingSubscription.id,
        })
        const currentPriceId = getStripeSubscriptionItem(expandedSubscription).price.id

        if (
          expandedSubscription.status === "incomplete" &&
          currentPriceId === priceId &&
          getStripeSubscriptionInterval(expandedSubscription) === args.interval
        ) {
          await reconcileStripeSubscription({
            ctx,
            stripe,
            subscription: expandedSubscription,
          })

          const confirmationPayload = getConfirmationPayload(expandedSubscription)

          return {
            alreadyExists: true,
            clientSecret: confirmationPayload.clientSecret,
            interval: args.interval,
            planKey: plan.key,
            requiresConfirmation: confirmationPayload.clientSecret !== undefined,
            secretType: confirmationPayload.secretType,
            status: expandedSubscription.status,
          }
        }

        throw new BillingActionError(
          "existing_subscription",
          "You already have a subscription in progress or on file. Manage it from billing settings.",
          409
        )
      }

      const subscription = await stripe.subscriptions.create(
        {
          collection_method: "charge_automatically",
          customer: customerId,
          expand: [
            "customer",
            "items.data.price.product",
            "latest_invoice.confirmation_secret",
            "latest_invoice.payment_intent",
            "pending_setup_intent",
            "schedule",
          ],
          items: [{ price: priceId, quantity: 1 }],
          metadata: {
            app: STRIPE_CATALOG_APP,
            billingInterval: args.interval,
            clerkUserId: userContext.user.clerkUserId,
            planKey: plan.key,
            userId: userContext.user._id,
          },
          payment_behavior: "default_incomplete",
          payment_settings: {
            save_default_payment_method: "on_subscription",
          },
        },
        {
          idempotencyKey: [
            "billing",
            "create",
            userContext.user._id,
            plan.key,
            args.interval,
            args.attemptKey ?? "default",
          ].join(":"),
        }
      )

      await reconcileStripeSubscription({
        ctx,
        stripe,
        subscription,
      })

      const confirmationPayload = getConfirmationPayload(subscription)

      await recordBillingAuditLog({
        action: "billing.checkout.started",
        ctx,
        details: JSON.stringify(
          {
            interval: args.interval,
            planKey: plan.key,
          },
          null,
          2
        ),
        entityId: `${userContext.user._id}:${plan.key}:${args.interval}`,
        entityLabel: plan.name,
        result: "success",
        summary: `Started checkout for ${plan.name} (${args.interval}).`,
        user: userContext.user,
        userName: userContext.actorName,
      })

      return {
        alreadyExists: false,
        clientSecret: confirmationPayload.clientSecret,
        interval: args.interval,
        planKey: plan.key,
        requiresConfirmation: confirmationPayload.clientSecret !== undefined,
        secretType: confirmationPayload.secretType,
        status: subscription.status,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const previewSubscriptionChange = action({
  args: {
    interval: billingIntervalValidator,
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const userContext = await requireBillingUser(ctx)

      if (!userContext.subscription) {
        throw new BillingActionError(
          "missing_subscription",
          "No active subscription was found for this account.",
          404
        )
      }

      const currentPlan = await ctx.runQuery(internal.queries.billing.internal.getPlanByKey, {
        planKey: userContext.subscription.planKey,
      })

      if (!currentPlan) {
        throw new BillingActionError(
          "missing_current_plan",
          "The current billing plan could not be resolved.",
          409
        )
      }

      if (args.planKey === "free") {
        return {
          amountDueNow: 0,
          currentAmount: getPlanAmount(currentPlan, userContext.subscription.interval),
          currentInterval: userContext.subscription.interval,
          currentPlanKey: currentPlan.key,
          effectiveAt: userContext.subscription.currentPeriodEnd ?? null,
          interval: "month" as const,
          mode: "cancel_at_period_end" as const,
          planKey: "free",
          prorationBehavior: "none" as const,
          summary:
            "This will cancel the paid subscription at the end of the current billing period and move the account back to free access.",
          targetAmount: 0,
        }
      }

      const { plan: targetPlan, priceId } = await getPurchasablePlan({
        ctx,
        interval: args.interval,
        planKey: args.planKey,
      })
      const changeKind = classifyPlanChange({
        currentInterval: userContext.subscription.interval,
        currentPlan,
        targetInterval: args.interval,
        targetPlan,
      })

      if (changeKind === "noop") {
        return {
          amountDueNow: 0,
          currentAmount: getPlanAmount(currentPlan, userContext.subscription.interval),
          currentInterval: userContext.subscription.interval,
          currentPlanKey: currentPlan.key,
          effectiveAt: null,
          interval: args.interval,
          mode: "noop" as const,
          planKey: targetPlan.key,
          prorationBehavior: "none" as const,
          summary: "That plan and billing interval is already active.",
          targetAmount: getPlanAmount(targetPlan, args.interval),
        }
      }

      if (changeKind === "downgrade_later" || changeKind === "switch_later") {
        return {
          amountDueNow: 0,
          currentAmount: getPlanAmount(currentPlan, userContext.subscription.interval),
          currentInterval: userContext.subscription.interval,
          currentPlanKey: currentPlan.key,
          effectiveAt: userContext.subscription.currentPeriodEnd ?? null,
          interval: args.interval,
          mode: "scheduled_change" as const,
          planKey: targetPlan.key,
          prorationBehavior: "none" as const,
          summary:
            "This change will take effect at the next renewal. Existing access stays in place until the current billing period ends.",
          targetAmount: getPlanAmount(targetPlan, args.interval),
        }
      }

      const stripe = getStripe()
      const preview = await stripe.invoices.createPreview({
        customer: userContext.subscription.stripeCustomerId,
        subscription: userContext.subscription.stripeSubscriptionId,
        subscription_details: {
          items: userContext.subscription.stripeSubscriptionItemId
            ? [
                {
                  id: userContext.subscription.stripeSubscriptionItemId,
                  price: priceId,
                  quantity: 1,
                },
              ]
            : [
                {
                  price: priceId,
                  quantity: 1,
                },
              ],
          proration_behavior: "always_invoice",
        },
      })

      return {
        amountDueNow: preview.amount_due,
        currentAmount: getPlanAmount(currentPlan, userContext.subscription.interval),
        currentInterval: userContext.subscription.interval,
        currentPlanKey: currentPlan.key,
        effectiveAt: Date.now(),
        interval: args.interval,
        mode: "immediate_change" as const,
        planKey: targetPlan.key,
        prorationBehavior: "always_invoice" as const,
        summary:
          "The subscription will update immediately and Stripe will calculate any proration adjustments when the change invoice is created.",
        targetAmount: getPlanAmount(targetPlan, args.interval),
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const changeSubscriptionPlan = action({
  args: {
    interval: billingIntervalValidator,
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await assertCheckoutEnabled(ctx)

      const userContext = await requireBillingUser(ctx)

      if (!userContext.subscription) {
        throw new BillingActionError(
          "missing_subscription",
          "No active subscription was found for this account.",
          404
        )
      }

      const currentPlan = await ctx.runQuery(internal.queries.billing.internal.getPlanByKey, {
        planKey: userContext.subscription.planKey,
      })

      if (!currentPlan) {
        throw new BillingActionError(
          "missing_current_plan",
          "The current billing plan could not be resolved.",
          409
        )
      }

      const stripe = getStripe()
      const currentSubscription = await getExpandedSubscription({
        stripe,
        subscriptionId: userContext.subscription.stripeSubscriptionId,
      })

      if (args.planKey === "free") {
        const updatedSubscription = await stripe.subscriptions.update(
          currentSubscription.id,
          {
            cancel_at_period_end: true,
          }
        )

        await ctx.runMutation(
          internal.mutations.billing.state.setSubscriptionScheduledChange,
          {
            scheduledChangeAt: getSubscriptionCurrentPeriodEnd(updatedSubscription),
            scheduledChangeRequestedAt: Date.now(),
            scheduledChangeType: "cancel",
            stripeSubscriptionId: updatedSubscription.id,
          }
        )

        await recordBillingAuditLog({
          action: "billing.subscription.cancel_scheduled",
          ctx,
          details: JSON.stringify(
            {
              effectiveAt: getSubscriptionCurrentPeriodEnd(updatedSubscription),
            },
            null,
            2
          ),
          entityId: updatedSubscription.id,
          entityLabel: currentPlan.name,
          result: "success",
          summary: `Scheduled cancellation for ${currentPlan.name}.`,
          user: userContext.user,
          userName: userContext.actorName,
        })

        return {
          effectiveAt: getSubscriptionCurrentPeriodEnd(updatedSubscription),
          mode: "cancel_at_period_end" as const,
          requiresConfirmation: false,
        }
      }

      const { plan: targetPlan, priceId } = await getPurchasablePlan({
        ctx,
        interval: args.interval,
        planKey: args.planKey,
      })
      const changeKind = classifyPlanChange({
        currentInterval: userContext.subscription.interval,
        currentPlan,
        targetInterval: args.interval,
        targetPlan,
      })

      if (changeKind === "noop") {
        throw new BillingActionError(
          "noop_change",
          "That plan is already active.",
          409
        )
      }

      if (changeKind === "downgrade_later" || changeKind === "switch_later") {
        await releaseExistingSchedule(currentSubscription, stripe)

        const currentItem = getStripeSubscriptionItem(currentSubscription)
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: currentSubscription.id,
        })
        const updatedSchedule = await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: "release",
          phases: [
            {
              end_date: currentItem.current_period_end,
              items: [
                {
                  price: currentItem.price.id,
                  quantity: currentItem.quantity ?? 1,
                },
              ],
              start_date: "now",
            },
            {
              items: [
                {
                  price: priceId,
                  quantity: 1,
                },
              ],
              proration_behavior: "none",
              start_date: getStripeSubscriptionItem(currentSubscription).current_period_end,
            },
          ],
        })

        await ctx.runMutation(
          internal.mutations.billing.state.setSubscriptionScheduledChange,
          {
            scheduledChangeAt: getSubscriptionCurrentPeriodEnd(currentSubscription),
            scheduledChangeRequestedAt: Date.now(),
            scheduledChangeType: "plan_change",
            scheduledInterval: args.interval,
            scheduledPlanKey: targetPlan.key,
            stripeScheduleId: updatedSchedule.id,
            stripeSubscriptionId: currentSubscription.id,
          }
        )

        await recordBillingAuditLog({
          action: "billing.subscription.plan_change_scheduled",
          ctx,
          details: JSON.stringify(
            {
              effectiveAt: getSubscriptionCurrentPeriodEnd(currentSubscription),
              interval: args.interval,
              nextPlanKey: targetPlan.key,
            },
            null,
            2
          ),
          entityId: currentSubscription.id,
          entityLabel: `${currentPlan.name} -> ${targetPlan.name}`,
          result: "success",
          summary: `Scheduled ${targetPlan.name} (${args.interval}) for the next renewal.`,
          user: userContext.user,
          userName: userContext.actorName,
        })

        return {
          effectiveAt: getSubscriptionCurrentPeriodEnd(currentSubscription),
          mode: "scheduled_change" as const,
          requiresConfirmation: false,
        }
      }

      await releaseExistingSchedule(currentSubscription, stripe)

      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.id,
        {
          cancel_at_period_end: false,
          expand: [
            "customer",
            "items.data.price.product",
            "latest_invoice.confirmation_secret",
            "latest_invoice.payment_intent",
            "pending_setup_intent",
            "schedule",
          ],
          items: [
            {
              id: getStripeSubscriptionItem(currentSubscription).id,
              price: priceId,
              quantity: 1,
            },
          ],
          payment_behavior: "pending_if_incomplete",
          proration_behavior: "always_invoice",
        }
      )

      await reconcileStripeSubscription({
        ctx,
        stripe,
        subscription: updatedSubscription,
      })
      await ctx.runMutation(
        internal.mutations.billing.state.clearSubscriptionScheduledChange,
        {
          stripeSubscriptionId: updatedSubscription.id,
        }
      )

      const confirmationPayload = getConfirmationPayload(updatedSubscription)

      await recordBillingAuditLog({
        action: "billing.subscription.plan_changed",
        ctx,
        details: JSON.stringify(
          {
            interval: args.interval,
            nextPlanKey: targetPlan.key,
            requiresConfirmation: confirmationPayload.clientSecret !== undefined,
          },
          null,
          2
        ),
        entityId: updatedSubscription.id,
        entityLabel: `${currentPlan.name} -> ${targetPlan.name}`,
        result: "success",
        summary: `Updated subscription to ${targetPlan.name} (${args.interval}).`,
        user: userContext.user,
        userName: userContext.actorName,
      })

      return {
        clientSecret: confirmationPayload.clientSecret,
        effectiveAt: Date.now(),
        mode: "immediate_change" as const,
        requiresConfirmation: confirmationPayload.clientSecret !== undefined,
        secretType: confirmationPayload.secretType,
        status: updatedSubscription.status,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const cancelCurrentSubscription = action({
  args: {},
  handler: async (ctx) => {
    try {
      const userContext = await requireBillingUser(ctx)

      if (!userContext.subscription) {
        throw new BillingActionError(
          "missing_subscription",
          "No active subscription was found for this account.",
          404
        )
      }

      const stripe = getStripe()
      const updatedSubscription = await stripe.subscriptions.update(
        userContext.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      )

      await ctx.runMutation(
        internal.mutations.billing.state.setSubscriptionScheduledChange,
        {
          scheduledChangeAt: getSubscriptionCurrentPeriodEnd(updatedSubscription),
          scheduledChangeRequestedAt: Date.now(),
          scheduledChangeType: "cancel",
          stripeSubscriptionId: updatedSubscription.id,
        }
      )

      await recordBillingAuditLog({
        action: "billing.subscription.cancel_scheduled",
        ctx,
        details: JSON.stringify(
          {
            effectiveAt: getSubscriptionCurrentPeriodEnd(updatedSubscription),
          },
          null,
          2
        ),
        entityId: updatedSubscription.id,
        entityLabel: userContext.subscription.planKey,
        result: "success",
        summary: "Scheduled subscription cancellation at period end.",
        user: userContext.user,
        userName: userContext.actorName,
      })

      return {
        effectiveAt: getSubscriptionCurrentPeriodEnd(updatedSubscription),
        mode: "cancel_at_period_end" as const,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const reactivateCurrentSubscription = action({
  args: {},
  handler: async (ctx) => {
    try {
      await assertCheckoutEnabled(ctx)

      const userContext = await requireBillingUser(ctx)

      if (!userContext.subscription) {
        throw new BillingActionError(
          "missing_subscription",
          "No active subscription was found for this account.",
          404
        )
      }

      const stripe = getStripe()
      const currentSubscription = await getExpandedSubscription({
        stripe,
        subscriptionId: userContext.subscription.stripeSubscriptionId,
      })

      await releaseExistingSchedule(currentSubscription, stripe)

      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.id,
        {
          cancel_at_period_end: false,
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

      await reconcileStripeSubscription({
        ctx,
        stripe,
        subscription: updatedSubscription,
      })
      await ctx.runMutation(
        internal.mutations.billing.state.clearSubscriptionScheduledChange,
        {
          stripeSubscriptionId: updatedSubscription.id,
        }
      )

      await recordBillingAuditLog({
        action: "billing.subscription.reactivated",
        ctx,
        entityId: updatedSubscription.id,
        entityLabel: userContext.subscription.planKey,
        result: "success",
        summary: "Reactivated the current subscription.",
        user: userContext.user,
        userName: userContext.actorName,
      })

      return {
        mode: "reactivated" as const,
        status: updatedSubscription.status,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const listInvoices = action({
  args: {},
  handler: async (ctx) => {
    try {
      const userContext = await requireBillingUser(ctx)

      if (!userContext.customer?.stripeCustomerId) {
        return []
      }

      const stripe = getStripe()
      const invoices = await stripe.invoices.list({
        customer: userContext.customer.stripeCustomerId,
        expand: ["data.payment_intent"],
        limit: 24,
      })

      return invoices.data.map((invoice) => ({
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        createdAt: invoice.created * 1000,
        currency: invoice.currency,
        description: getInvoiceDescription(invoice),
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
        interval:
          invoice.lines.data[0]?.pricing?.type === "price_details" &&
          typeof invoice.lines.data[0].pricing.price_details?.price === "object" &&
          invoice.lines.data[0].pricing.price_details.price.recurring?.interval ===
            "year"
            ? "year"
            : invoice.lines.data[0]?.pricing?.type === "price_details" &&
                typeof invoice.lines.data[0].pricing.price_details?.price ===
                  "object" &&
                invoice.lines.data[0].pricing.price_details.price.recurring
                  ?.interval === "month"
              ? "month"
              : undefined,
        invoiceNumber: invoice.number ?? undefined,
        invoicePdfUrl: invoice.invoice_pdf ?? undefined,
        status: invoice.status ?? "draft",
      }))
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})
