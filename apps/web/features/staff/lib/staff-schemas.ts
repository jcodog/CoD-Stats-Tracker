import { z } from "zod"

const catalogKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-_]*$/)

const textSchema = z.string().trim().min(1).max(120)

export const managementActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("updateUserRole"),
    input: z.object({
      nextRole: z.enum(["user", "staff", "admin"]),
      targetClerkUserId: z.string().min(1),
    }),
  }),
])

export const billingActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("archiveFeature"),
    input: z.object({
      confirmationToken: z.string().min(1),
      featureKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("archivePlan"),
    input: z.object({
      cancelAtPeriodEnd: z.boolean(),
      confirmationToken: z.string().min(1),
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("grantCreatorAccess"),
    input: z.object({
      endsAt: z.number().int().positive().optional(),
      planKey: catalogKeySchema,
      reason: z.string().trim().min(8).max(500),
      targetUserId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal("backfillCreatorGrantStripeSubscriptions"),
    input: z.object({}).optional().default({}),
  }),
  z.object({
    action: z.literal("previewFeatureArchive"),
    input: z.object({
      featureKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("previewFeatureAssignmentChange"),
    input: z.object({
      enabled: z.boolean(),
      featureKey: catalogKeySchema,
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("previewFeatureAssignmentSync"),
    input: z.object({
      featureKey: catalogKeySchema,
      planKeys: z.array(catalogKeySchema),
    }),
  }),
  z.object({
    action: z.literal("previewPlanArchive"),
    input: z.object({
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("previewPlanFeatureSync"),
    input: z.object({
      featureKeys: z.array(catalogKeySchema),
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("previewPriceReplacement"),
    input: z.object({
      interval: z.enum(["month", "year"]),
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("replacePlanPrice"),
    input: z.object({
      amount: z.number().int().nonnegative(),
      confirmationToken: z.string().min(1),
      interval: z.enum(["month", "year"]),
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("revokeCreatorAccess"),
    input: z.object({
      reason: z.string().trim().min(8).max(500),
      targetUserId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal("runCatalogSync"),
    input: z.object({}).optional().default({}),
  }),
  z.object({
    action: z.literal("syncFeatureAssignments"),
    input: z.object({
      featureKey: catalogKeySchema,
      planKeys: z.array(catalogKeySchema),
    }),
  }),
  z.object({
    action: z.literal("setFeatureAssignment"),
    input: z.object({
      enabled: z.boolean(),
      featureKey: catalogKeySchema,
      planKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("upsertFeature"),
    input: z.object({
      active: z.boolean(),
      appliesTo: z.enum(["entitlement", "marketing", "both"]),
      category: z.string().trim().max(80).optional(),
      description: z.string().trim().max(320),
      key: catalogKeySchema,
      name: textSchema,
      sortOrder: z.number().int(),
    }),
  }),
  z.object({
    action: z.literal("upsertPlan"),
    input: z.object({
      active: z.boolean(),
      currency: z.string().trim().length(3),
      description: z.string().trim().max(320),
      featureKeys: z.array(catalogKeySchema),
      key: catalogKeySchema,
      monthlyPriceAmount: z.number().int().nonnegative(),
      name: textSchema,
      planType: z.enum(["free", "paid"]),
      sortOrder: z.number().int(),
      yearlyPriceAmount: z.number().int().nonnegative(),
    }),
  }),
])

export const rankedActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setCurrentRankedConfig"),
    input: z.object({
      activeSeason: z.number().int().min(1).max(999),
      activeTitleKey: catalogKeySchema,
      sessionWritesEnabled: z.boolean(),
    }),
  }),
  z.object({
    action: z.literal("upsertRankedTitle"),
    input: z.object({
      isActive: z.boolean(),
      key: catalogKeySchema,
      label: textSchema.max(80),
      sortOrder: z.number().int(),
    }),
  }),
  z.object({
    action: z.literal("upsertRankedMap"),
    input: z.object({
      isActive: z.boolean(),
      mapId: z.string().min(1).optional(),
      name: textSchema.max(80),
      sortOrder: z.number().int(),
      supportedModeIds: z.array(z.string().min(1)).min(1),
      titleKey: catalogKeySchema,
    }),
  }),
  z.object({
    action: z.literal("upsertRankedMode"),
    input: z.object({
      isActive: z.boolean(),
      key: catalogKeySchema,
      label: textSchema.max(80),
      modeId: z.string().min(1).optional(),
      sortOrder: z.number().int(),
      titleKey: catalogKeySchema,
    }),
  }),
])

export type BillingActionRequest = z.infer<typeof billingActionSchema>
export type ManagementActionRequest = z.infer<typeof managementActionSchema>
export type RankedActionRequest = z.infer<typeof rankedActionSchema>
