import { z } from "zod"

const billingPlanKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-_]*$/)

export const billingIntervalSchema = z.enum(["month", "year"])

export const createSubscriptionIntentSchema = z.object({
  attemptKey: z.string().trim().min(1).max(160).optional(),
  interval: billingIntervalSchema,
  planKey: billingPlanKeySchema,
})

export const subscriptionChangeSchema = z.object({
  interval: billingIntervalSchema,
  planKey: z.union([billingPlanKeySchema, z.literal("free")]),
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
export type SubscriptionChangeInput = z.infer<typeof subscriptionChangeSchema>
