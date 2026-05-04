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
const creatorCodeSchema = z.string().trim().min(3).max(48)

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
export type CreateSubscriptionCheckoutSessionInput = z.infer<
  typeof createSubscriptionCheckoutSessionSchema
>
export type PreviewCheckoutQuoteInput = z.infer<
  typeof previewCheckoutQuoteSchema
>
