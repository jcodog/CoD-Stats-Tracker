import { z } from "zod"

const billingPlanKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-_]*$/)

export const billingIntervalSchema = z.enum(["month", "year"])
export const supportedPricingCurrencySchema = z.enum([
  "GBP",
  "USD",
  "CAD",
  "EUR",
])
const billingAddressSchema = z.object({
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  line1: z.string().max(160).optional(),
  line2: z.string().max(160).optional(),
  postalCode: z.string().max(32).optional(),
  state: z.string().max(120).optional(),
})
const paymentMethodIdSchema = z.string().trim().min(1).max(128)
const stripeSubscriptionIdSchema = z.string().trim().min(1).max(128)
const creatorCodeSchema = z.string().trim().min(3).max(48)

export const createSubscriptionIntentSchema = z.object({
  attemptKey: z.string().trim().min(1).max(160).optional(),
  creatorCode: creatorCodeSchema.optional(),
  interval: billingIntervalSchema,
  planKey: billingPlanKeySchema,
  preferredCurrency: supportedPricingCurrencySchema.optional(),
})

export const createSubscriptionCheckoutSessionSchema = z.object({
  creatorCode: creatorCodeSchema.optional(),
  interval: billingIntervalSchema,
  planKey: billingPlanKeySchema,
  preferredCurrency: supportedPricingCurrencySchema.optional(),
})

export const previewCheckoutQuoteSchema = z.object({
  creatorCode: creatorCodeSchema.optional(),
  interval: billingIntervalSchema,
  planKey: billingPlanKeySchema,
  preferredCurrency: supportedPricingCurrencySchema.optional(),
})

export const subscriptionChangeSchema = z.object({
  interval: billingIntervalSchema,
  planKey: z.union([billingPlanKeySchema, z.literal("free")]),
  prorationDate: z.number().int().positive().optional(),
  stripeSubscriptionId: stripeSubscriptionIdSchema.optional(),
})

export const subscriptionTargetSchema = z.object({
  stripeSubscriptionId: stripeSubscriptionIdSchema,
})

export const subscriptionCancellationModeSchema = z.enum([
  "immediately",
  "period_end",
])

export const cancelSubscriptionSchema = subscriptionTargetSchema.extend({
  mode: subscriptionCancellationModeSchema,
})

export const updateBillingProfileSchema = z.object({
  address: billingAddressSchema.optional(),
  businessName: z.string().max(150).optional(),
  email: z.string().email().max(320).or(z.literal("")).optional(),
  name: z.string().max(150).optional(),
  phone: z.string().max(40).optional(),
})

export const paymentMethodActionSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
})

export const creatorGrantSchema = z.object({
  endsAt: z.number().int().positive().optional(),
  planKey: billingPlanKeySchema,
  reason: z.string().trim().min(8).max(500),
  targetUserId: z.string().min(1),
})

export const revokeCreatorGrantSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  targetUserId: z.string().min(1),
})

export type BillingIntervalInput = z.infer<typeof billingIntervalSchema>
export type CreateSubscriptionIntentInput = z.infer<
  typeof createSubscriptionIntentSchema
>
export type CreateSubscriptionCheckoutSessionInput = z.infer<
  typeof createSubscriptionCheckoutSessionSchema
>
export type PreviewCheckoutQuoteInput = z.infer<
  typeof previewCheckoutQuoteSchema
>
export type SubscriptionChangeInput = z.infer<typeof subscriptionChangeSchema>
export type SubscriptionTargetInput = z.infer<typeof subscriptionTargetSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
export type UpdateBillingProfileInput = z.infer<typeof updateBillingProfileSchema>
export type PaymentMethodActionInput = z.infer<typeof paymentMethodActionSchema>
