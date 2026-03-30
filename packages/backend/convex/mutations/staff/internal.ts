import { internal } from "../../_generated/api"
import type { Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { v } from "convex/values"
import {
  applyGlobalLandingStatsDelta,
  applyUserLandingStatsDelta,
} from "../../lib/landingMetrics"
import { normalizeStatsLookupValue } from "../../lib/statsDashboard"

const roleValidator = v.union(
  v.literal("user"),
  v.literal("staff"),
  v.literal("admin"),
  v.literal("super_admin")
)

const billingPlanTypeValidator = v.union(v.literal("free"), v.literal("paid"))

const billingFeatureApplyModeValidator = v.union(
  v.literal("entitlement"),
  v.literal("marketing"),
  v.literal("both")
)

const subscriptionStatusValidator = v.union(
  v.literal("incomplete"),
  v.literal("trialing"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
  v.literal("paused"),
  v.literal("incomplete_expired")
)

type BillingPlanPatch = Partial<
  Pick<
    Doc<"billingPlans">,
    | "active"
    | "archivedAt"
    | "currency"
    | "description"
    | "monthlyPriceAmount"
    | "name"
    | "planType"
    | "sortOrder"
    | "updatedAt"
    | "yearlyPriceAmount"
  >
>

type BillingFeaturePatch = Partial<
  Pick<
    Doc<"billingFeatures">,
    | "active"
    | "appliesTo"
    | "archivedAt"
    | "category"
    | "description"
    | "name"
    | "sortOrder"
    | "updatedAt"
  >
>

function normalizeCatalogKey(value: string, fieldLabel: string) {
  const normalizedValue = normalizeStatsLookupValue(value)

  if (normalizedValue.length < 2 || normalizedValue.length > 64) {
    throw new Error(`${fieldLabel} must be between 2 and 64 characters.`)
  }

  return normalizedValue
}

function normalizeLabel(value: string, fieldLabel: string, maxLength = 120) {
  const normalizedValue = value.trim().replace(/\s+/g, " ")

  if (normalizedValue.length === 0 || normalizedValue.length > maxLength) {
    throw new Error(`${fieldLabel} must be between 1 and ${maxLength} characters.`)
  }

  return normalizedValue
}

function normalizeSeason(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 999) {
    throw new Error("Active season must be a whole number between 1 and 999.")
  }

  return value
}

function resolveArchiveReason(args: {
  seasonChanged: boolean
  titleChanged: boolean
}) {
  if (args.titleChanged && args.seasonChanged) {
    return "title_and_season_rollover" as const
  }

  if (args.titleChanged) {
    return "title_rollover" as const
  }

  return "season_rollover" as const
}

function uniqueKeys(values: string[]) {
  return Array.from(new Set(values))
}

function countSessionsByUserId(
  sessions: Array<Pick<Doc<"sessions">, "userId">>
) {
  const counts = new Map<string, number>()

  for (const session of sessions) {
    counts.set(session.userId, (counts.get(session.userId) ?? 0) + 1)
  }

  return counts
}

async function resolveSupportedRankedModes(args: {
  ctx: MutationCtx
  supportedModeIds: Array<Doc<"rankedModes">["_id"]>
  titleKey: string
}) {
  const uniqueModeIds = Array.from(new Set(args.supportedModeIds))

  if (uniqueModeIds.length === 0) {
    throw new Error("Select at least one active ranked mode for this map.")
  }

  const modes = await Promise.all(uniqueModeIds.map((modeId) => args.ctx.db.get(modeId)))

  if (modes.some((mode) => mode === null)) {
    throw new Error("One or more selected ranked modes could not be found.")
  }

  const resolvedModes = modes.filter((mode): mode is Doc<"rankedModes"> => mode !== null)

  if (
    resolvedModes.some(
      (mode) => !mode.isActive || mode.titleKey !== args.titleKey
    )
  ) {
    throw new Error("Maps can only use active ranked modes from the selected title.")
  }

  return resolvedModes
}

async function syncPlanFeatureAssignmentsByPlan(args: {
  ctx: MutationCtx
  featureKeys: string[]
  planKey: string
}) {
  const existingAssignments = await args.ctx.db
    .query("billingPlanFeatures")
    .withIndex("by_planKey", (query) => query.eq("planKey", args.planKey))
    .collect()
  const desiredFeatureKeys = new Set(uniqueKeys(args.featureKeys))
  const existingAssignmentsByFeatureKey = new Map(
    existingAssignments.map((assignment) => [assignment.featureKey, assignment])
  )
  const attachedFeatureKeys: string[] = []
  const detachedFeatureKeys: string[] = []
  const now = Date.now()

  for (const featureKey of desiredFeatureKeys) {
    const existingAssignment = existingAssignmentsByFeatureKey.get(featureKey)

    if (!existingAssignment) {
      await args.ctx.db.insert("billingPlanFeatures", {
        createdAt: now,
        enabled: true,
        featureKey,
        planKey: args.planKey,
        updatedAt: now,
      })
      attachedFeatureKeys.push(featureKey)
      continue
    }

    if (existingAssignment.enabled) {
      continue
    }

    await args.ctx.db.patch(existingAssignment._id, {
      enabled: true,
      updatedAt: now,
    })
    attachedFeatureKeys.push(featureKey)
  }

  for (const existingAssignment of existingAssignments) {
    if (!existingAssignment.enabled || desiredFeatureKeys.has(existingAssignment.featureKey)) {
      continue
    }

    await args.ctx.db.patch(existingAssignment._id, {
      enabled: false,
      updatedAt: now,
    })
    detachedFeatureKeys.push(existingAssignment.featureKey)
  }

  return {
    attachedFeatureKeys,
    detachedFeatureKeys,
  }
}

async function syncPlanFeatureAssignmentsByFeature(args: {
  ctx: MutationCtx
  featureKey: string
  planKeys: string[]
}) {
  const existingAssignments = await args.ctx.db
    .query("billingPlanFeatures")
    .withIndex("by_featureKey", (query) => query.eq("featureKey", args.featureKey))
    .collect()
  const desiredPlanKeys = new Set(uniqueKeys(args.planKeys))
  const existingAssignmentsByPlanKey = new Map(
    existingAssignments.map((assignment) => [assignment.planKey, assignment])
  )
  const attachedPlanKeys: string[] = []
  const detachedPlanKeys: string[] = []
  const now = Date.now()

  for (const planKey of desiredPlanKeys) {
    const existingAssignment = existingAssignmentsByPlanKey.get(planKey)

    if (!existingAssignment) {
      await args.ctx.db.insert("billingPlanFeatures", {
        createdAt: now,
        enabled: true,
        featureKey: args.featureKey,
        planKey,
        updatedAt: now,
      })
      attachedPlanKeys.push(planKey)
      continue
    }

    if (existingAssignment.enabled) {
      continue
    }

    await args.ctx.db.patch(existingAssignment._id, {
      enabled: true,
      updatedAt: now,
    })
    attachedPlanKeys.push(planKey)
  }

  for (const existingAssignment of existingAssignments) {
    if (!existingAssignment.enabled || desiredPlanKeys.has(existingAssignment.planKey)) {
      continue
    }

    await args.ctx.db.patch(existingAssignment._id, {
      enabled: false,
      updatedAt: now,
    })
    detachedPlanKeys.push(existingAssignment.planKey)
  }

  return {
    attachedPlanKeys,
    detachedPlanKeys,
  }
}

export const insertAuditLog = internalMutation({
  args: {
    action: v.string(),
    actorClerkUserId: v.string(),
    actorName: v.string(),
    actorRole: roleValidator,
    details: v.optional(v.string()),
    entityId: v.string(),
    entityLabel: v.optional(v.string()),
    entityType: v.string(),
    result: v.union(v.literal("success"), v.literal("warning"), v.literal("error")),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staffAuditLogs", {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const setUserRole = internalMutation({
  args: {
    clerkUserId: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (query) =>
        query.eq("clerkUserId", args.clerkUserId)
      )
      .unique()

    if (!user) {
      throw new Error(`User not found for Clerk user ${args.clerkUserId}`)
    }

    if (user.role === args.role) {
      return user
    }

    await ctx.db.patch(user._id, {
      role: args.role,
      updatedAt: Date.now(),
    })

    return {
      ...user,
      role: args.role,
    }
  },
})

export const upsertPlan = internalMutation({
  args: {
    active: v.boolean(),
    currency: v.string(),
    description: v.string(),
    key: v.string(),
    monthlyPriceAmount: v.number(),
    name: v.string(),
    planType: billingPlanTypeValidator,
    sortOrder: v.number(),
    yearlyPriceAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db
      .query("billingPlans")
      .withIndex("by_key", (query) => query.eq("key", args.key))
      .unique()
    const now = Date.now()

    if (!existingPlan) {
      return await ctx.db.insert("billingPlans", {
        active: args.active,
        archivedAt: args.active ? undefined : now,
        currency: args.currency,
        description: args.description,
        key: args.key,
        monthlyPriceAmount: args.monthlyPriceAmount,
        monthlyPriceId: undefined,
        name: args.name,
        planType: args.planType,
        sortOrder: args.sortOrder,
        stripeProductId: undefined,
        createdAt: now,
        updatedAt: now,
        yearlyPriceAmount: args.yearlyPriceAmount,
        yearlyPriceId: undefined,
      })
    }

    const patch: BillingPlanPatch = {}

    if (existingPlan.active !== args.active) {
      patch.active = args.active
      patch.archivedAt = args.active ? undefined : now
    }

    if (existingPlan.currency !== args.currency) patch.currency = args.currency
    if (existingPlan.description !== args.description) {
      patch.description = args.description
    }
    if (existingPlan.monthlyPriceAmount !== args.monthlyPriceAmount) {
      patch.monthlyPriceAmount = args.monthlyPriceAmount
    }
    if (existingPlan.name !== args.name) patch.name = args.name
    if (existingPlan.planType !== args.planType) patch.planType = args.planType
    if (existingPlan.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder
    if (existingPlan.yearlyPriceAmount !== args.yearlyPriceAmount) {
      patch.yearlyPriceAmount = args.yearlyPriceAmount
    }

    if (Object.keys(patch).length === 0) {
      return existingPlan._id
    }

    patch.updatedAt = now
    await ctx.db.patch(existingPlan._id, patch)
    return existingPlan._id
  },
})

export const setPlanActiveState = internalMutation({
  args: {
    active: v.boolean(),
    archivedAt: v.optional(v.number()),
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("billingPlans")
      .withIndex("by_key", (query) => query.eq("key", args.planKey))
      .unique()

    if (!plan) {
      throw new Error(`Billing plan not found: ${args.planKey}`)
    }

    await ctx.db.patch(plan._id, {
      active: args.active,
      archivedAt: args.archivedAt,
      updatedAt: Date.now(),
    })

    return {
      ...plan,
      active: args.active,
      archivedAt: args.archivedAt,
    }
  },
})

export const upsertFeature = internalMutation({
  args: {
    active: v.boolean(),
    appliesTo: billingFeatureApplyModeValidator,
    category: v.optional(v.string()),
    description: v.string(),
    key: v.string(),
    name: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const existingFeature = await ctx.db
      .query("billingFeatures")
      .withIndex("by_key", (query) => query.eq("key", args.key))
      .unique()
    const now = Date.now()

    if (!existingFeature) {
      return await ctx.db.insert("billingFeatures", {
        active: args.active,
        appliesTo: args.appliesTo,
        archivedAt: args.active ? undefined : now,
        category: args.category,
        description: args.description,
        key: args.key,
        name: args.name,
        sortOrder: args.sortOrder,
        stripeFeatureId: undefined,
        createdAt: now,
        updatedAt: now,
      })
    }

    const patch: BillingFeaturePatch = {}

    if (existingFeature.active !== args.active) {
      patch.active = args.active
      patch.archivedAt = args.active ? undefined : now
    }
    if ((existingFeature.appliesTo ?? "both") !== args.appliesTo) {
      patch.appliesTo = args.appliesTo
    }
    if ((existingFeature.category ?? undefined) !== args.category) {
      patch.category = args.category
    }
    if (existingFeature.description !== args.description) {
      patch.description = args.description
    }
    if (existingFeature.name !== args.name) patch.name = args.name
    if (existingFeature.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder

    if (Object.keys(patch).length === 0) {
      return existingFeature._id
    }

    patch.updatedAt = now
    await ctx.db.patch(existingFeature._id, patch)
    return existingFeature._id
  },
})

export const setFeatureActiveState = internalMutation({
  args: {
    active: v.boolean(),
    archivedAt: v.optional(v.number()),
    featureKey: v.string(),
  },
  handler: async (ctx, args) => {
    const feature = await ctx.db
      .query("billingFeatures")
      .withIndex("by_key", (query) => query.eq("key", args.featureKey))
      .unique()

    if (!feature) {
      throw new Error(`Billing feature not found: ${args.featureKey}`)
    }

    await ctx.db.patch(feature._id, {
      active: args.active,
      archivedAt: args.archivedAt,
      updatedAt: Date.now(),
    })

    return {
      ...feature,
      active: args.active,
      archivedAt: args.archivedAt,
    }
  },
})

export const setPlanFeatureAssignment = internalMutation({
  args: {
    enabled: v.boolean(),
    featureKey: v.string(),
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existingAssignment = await ctx.db
      .query("billingPlanFeatures")
      .withIndex("by_planKey_featureKey", (query) =>
        query.eq("planKey", args.planKey).eq("featureKey", args.featureKey)
      )
      .unique()
    const now = Date.now()

    if (!existingAssignment) {
      return await ctx.db.insert("billingPlanFeatures", {
        createdAt: now,
        enabled: args.enabled,
        featureKey: args.featureKey,
        planKey: args.planKey,
        updatedAt: now,
      })
    }

    if (existingAssignment.enabled === args.enabled) {
      return existingAssignment._id
    }

    await ctx.db.patch(existingAssignment._id, {
      enabled: args.enabled,
      updatedAt: now,
    })

    return existingAssignment._id
  },
})

export const syncPlanFeatureAssignmentsForPlan = internalMutation({
  args: {
    featureKeys: v.array(v.string()),
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await syncPlanFeatureAssignmentsByPlan({
      ctx,
      featureKeys: args.featureKeys,
      planKey: args.planKey,
    })
  },
})

export const syncPlanFeatureAssignmentsForFeature = internalMutation({
  args: {
    featureKey: v.string(),
    planKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await syncPlanFeatureAssignmentsByFeature({
      ctx,
      featureKey: args.featureKey,
      planKeys: args.planKeys,
    })
  },
})

export const updateSubscriptionsAfterCancel = internalMutation({
  args: {
    updates: v.array(
      v.object({
        cancelAtPeriodEnd: v.boolean(),
        canceledAt: v.optional(v.number()),
        currentPeriodEnd: v.optional(v.number()),
        status: v.optional(subscriptionStatusValidator),
        stripeSubscriptionId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const existingSubscription = await ctx.db
        .query("billingSubscriptions")
        .withIndex("by_stripeSubscriptionId", (query) =>
          query.eq("stripeSubscriptionId", update.stripeSubscriptionId)
        )
        .unique()

      if (!existingSubscription) {
        continue
      }

      await ctx.db.patch(existingSubscription._id, {
        cancelAtPeriodEnd: update.cancelAtPeriodEnd,
        canceledAt: update.canceledAt,
        currentPeriodEnd: update.currentPeriodEnd,
        status: update.status ?? existingSubscription.status,
        updatedAt: Date.now(),
      })
    }
  },
})

export const upsertRankedTitle = internalMutation({
  args: {
    isActive: v.boolean(),
    key: v.string(),
    label: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const key = normalizeCatalogKey(args.key, "Title key")
    const label = normalizeLabel(args.label, "Title label", 80)

    if (!Number.isInteger(args.sortOrder)) {
      throw new Error("Sort order must be a whole number.")
    }

    const [existingTitle, currentConfig] = await Promise.all([
      ctx.db
        .query("rankedTitles")
        .withIndex("by_key", (query) => query.eq("key", key))
        .unique(),
      ctx.db
        .query("rankedConfigs")
        .withIndex("by_key", (query) => query.eq("key", "current"))
        .unique(),
    ])
    const now = Date.now()

    if (!args.isActive && currentConfig?.activeTitleKey === key) {
      throw new Error(
        "The current active ranked title cannot be archived. Switch the current title first."
      )
    }

    if (!existingTitle) {
      const titleId = await ctx.db.insert("rankedTitles", {
        createdAt: now,
        isActive: args.isActive,
        key,
        label,
        sortOrder: args.sortOrder,
        updatedAt: now,
      })

      return {
        id: titleId,
        isActive: args.isActive,
        isNew: true,
        key,
        label,
      }
    }

    const patch: Partial<Doc<"rankedTitles">> = {}

    if (existingTitle.isActive !== args.isActive) patch.isActive = args.isActive
    if (existingTitle.label !== label) patch.label = label
    if (existingTitle.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now
      await ctx.db.patch(existingTitle._id, patch)
    }

    return {
      id: existingTitle._id,
      isActive: patch.isActive ?? existingTitle.isActive,
      isNew: false,
      key,
      label: patch.label ?? existingTitle.label,
    }
  },
})

export const upsertRankedMode = internalMutation({
  args: {
    isActive: v.boolean(),
    key: v.string(),
    label: v.string(),
    modeId: v.optional(v.id("rankedModes")),
    sortOrder: v.number(),
    titleKey: v.string(),
  },
  handler: async (ctx, args) => {
    const titleKey = normalizeCatalogKey(args.titleKey, "Title key")
    const key = normalizeCatalogKey(args.key, "Mode key")
    const label = normalizeLabel(args.label, "Mode label", 80)

    if (!Number.isInteger(args.sortOrder)) {
      throw new Error("Sort order must be a whole number.")
    }

    const title = await ctx.db
      .query("rankedTitles")
      .withIndex("by_key", (query) => query.eq("key", titleKey))
      .unique()

    if (!title) {
      throw new Error(`Ranked title not found: ${titleKey}`)
    }

    const existingByKey = await ctx.db
      .query("rankedModes")
      .withIndex("by_title_key", (query) =>
        query.eq("titleKey", titleKey).eq("key", key)
      )
      .unique()
    const now = Date.now()

    if (!args.modeId) {
      if (!existingByKey) {
        const modeId = await ctx.db.insert("rankedModes", {
          createdAt: now,
          isActive: args.isActive,
          key,
          label,
          sortOrder: args.sortOrder,
          titleKey,
          updatedAt: now,
        })

        return {
          id: modeId,
          isActive: args.isActive,
          isNew: true,
          key,
          label,
          titleKey,
          titleLabel: title.label,
        }
      }

      const patch: Partial<Doc<"rankedModes">> = {}

      if (existingByKey.isActive !== args.isActive) patch.isActive = args.isActive
      if (existingByKey.label !== label) patch.label = label
      if (existingByKey.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now
        await ctx.db.patch(existingByKey._id, patch)
      }

      return {
        id: existingByKey._id,
        isActive: patch.isActive ?? existingByKey.isActive,
        isNew: false,
        key,
        label: patch.label ?? existingByKey.label,
        titleKey,
        titleLabel: title.label,
      }
    }

    const existingMode = await ctx.db.get(args.modeId)

    if (!existingMode) {
      throw new Error("Ranked mode not found.")
    }

    if (existingByKey && existingByKey._id !== existingMode._id) {
      throw new Error(`A ranked mode with key "${key}" already exists for ${title.label}.`)
    }

    const patch: Partial<Doc<"rankedModes">> = {}

    if (existingMode.isActive !== args.isActive) patch.isActive = args.isActive
    if (existingMode.key !== key) patch.key = key
    if (existingMode.label !== label) patch.label = label
    if (existingMode.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder
    if (existingMode.titleKey !== titleKey) patch.titleKey = titleKey

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now
      await ctx.db.patch(existingMode._id, patch)
    }

    return {
      id: existingMode._id,
      isActive: patch.isActive ?? existingMode.isActive,
      isNew: false,
      key: patch.key ?? existingMode.key,
      label: patch.label ?? existingMode.label,
      titleKey,
      titleLabel: title.label,
    }
  },
})

export const upsertRankedMap = internalMutation({
  args: {
    isActive: v.boolean(),
    mapId: v.optional(v.id("rankedMaps")),
    name: v.string(),
    sortOrder: v.number(),
    supportedModeIds: v.array(v.id("rankedModes")),
    titleKey: v.string(),
  },
  handler: async (ctx, args) => {
    const titleKey = normalizeCatalogKey(args.titleKey, "Title key")
    const name = normalizeLabel(args.name, "Map name", 80)
    const normalizedName = normalizeStatsLookupValue(name)

    if (!Number.isInteger(args.sortOrder)) {
      throw new Error("Sort order must be a whole number.")
    }

    const title = await ctx.db
      .query("rankedTitles")
      .withIndex("by_key", (query) => query.eq("key", titleKey))
      .unique()

    if (!title) {
      throw new Error(`Ranked title not found: ${titleKey}`)
    }

    const supportedModes = await resolveSupportedRankedModes({
      ctx,
      supportedModeIds: args.supportedModeIds,
      titleKey,
    })
    const supportedModeIds = supportedModes.map((mode) => mode._id)

    const existingByName = await ctx.db
      .query("rankedMaps")
      .withIndex("by_title_normalized", (query) =>
        query.eq("titleKey", titleKey).eq("normalizedName", normalizedName)
      )
      .unique()
    const now = Date.now()

    if (!args.mapId) {
      if (!existingByName) {
        const mapId = await ctx.db.insert("rankedMaps", {
          createdAt: now,
          isActive: args.isActive,
          name,
          normalizedName,
          sortOrder: args.sortOrder,
          supportedModeIds,
          titleKey,
          updatedAt: now,
        })

        return {
          id: mapId,
          isActive: args.isActive,
          isNew: true,
          name,
          supportedModeIds,
          supportedModeLabels: supportedModes.map((mode) => mode.label),
          titleKey,
          titleLabel: title.label,
        }
      }

      const patch: Partial<Doc<"rankedMaps">> = {}

      if (existingByName.isActive !== args.isActive) patch.isActive = args.isActive
      if (existingByName.name !== name) patch.name = name
      if (existingByName.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder
      if (
        JSON.stringify(existingByName.supportedModeIds ?? []) !==
        JSON.stringify(supportedModeIds)
      ) {
        patch.supportedModeIds = supportedModeIds
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now
        await ctx.db.patch(existingByName._id, patch)
      }

      return {
        id: existingByName._id,
        isActive: patch.isActive ?? existingByName.isActive,
        isNew: false,
        name: patch.name ?? existingByName.name,
        supportedModeIds: patch.supportedModeIds ?? existingByName.supportedModeIds ?? [],
        supportedModeLabels: supportedModes.map((mode) => mode.label),
        titleKey,
        titleLabel: title.label,
      }
    }

    const existingMap = await ctx.db.get(args.mapId)

    if (!existingMap) {
      throw new Error("Ranked map not found.")
    }

    if (existingByName && existingByName._id !== existingMap._id) {
      throw new Error(
        `A map named "${name}" already exists for the ${title.label} title.`
      )
    }

    const patch: Partial<Doc<"rankedMaps">> = {}

    if (existingMap.isActive !== args.isActive) patch.isActive = args.isActive
    if (existingMap.name !== name) patch.name = name
    if (existingMap.normalizedName !== normalizedName) {
      patch.normalizedName = normalizedName
    }
    if (existingMap.sortOrder !== args.sortOrder) patch.sortOrder = args.sortOrder
    if (
      JSON.stringify(existingMap.supportedModeIds ?? []) !==
      JSON.stringify(supportedModeIds)
    ) {
      patch.supportedModeIds = supportedModeIds
    }
    if (existingMap.titleKey !== titleKey) patch.titleKey = titleKey

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now
      await ctx.db.patch(existingMap._id, patch)
    }

    return {
      id: existingMap._id,
      isActive: patch.isActive ?? existingMap.isActive,
      isNew: false,
      name: patch.name ?? existingMap.name,
      supportedModeIds: patch.supportedModeIds ?? existingMap.supportedModeIds ?? [],
      supportedModeLabels: supportedModes.map((mode) => mode.label),
      titleKey,
      titleLabel: title.label,
    }
  },
})

export const setCurrentRankedConfig = internalMutation({
  args: {
    activeSeason: v.number(),
    activeTitleKey: v.string(),
    sessionWritesEnabled: v.boolean(),
    updatedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const activeTitleKey = normalizeCatalogKey(args.activeTitleKey, "Title key")
    const activeSeason = normalizeSeason(args.activeSeason)
    const [title, currentConfig] = await Promise.all([
      ctx.db
        .query("rankedTitles")
        .withIndex("by_key", (query) => query.eq("key", activeTitleKey))
        .unique(),
      ctx.db
        .query("rankedConfigs")
        .withIndex("by_key", (query) => query.eq("key", "current"))
        .unique(),
    ])

    if (!title) {
      throw new Error(`Ranked title not found: ${activeTitleKey}`)
    }

    if (!title.isActive) {
      throw new Error("Only active ranked titles can be selected as the current title.")
    }

    const now = Date.now()

    if (!currentConfig) {
      const configId = await ctx.db.insert("rankedConfigs", {
        activeSeason,
        activeTitleKey,
        key: "current",
        sessionWritesEnabled: args.sessionWritesEnabled,
        updatedAt: now,
        updatedByUserId: args.updatedByUserId,
      })

      return {
        activeSeason,
        activeTitleKey,
        activeTitleLabel: title.label,
        archivedSessionCount: 0,
        archiveReason: null,
        configId,
        didChange: true,
        didInitialize: true,
        seasonChanged: false,
        sessionWritesEnabled: args.sessionWritesEnabled,
        titleChanged: false,
      }
    }

    const titleChanged = currentConfig.activeTitleKey !== activeTitleKey
    const seasonChanged = currentConfig.activeSeason !== activeSeason
    const currentSessionWritesEnabled = currentConfig.sessionWritesEnabled !== false
    const writesChanged = currentSessionWritesEnabled !== args.sessionWritesEnabled

    if (!titleChanged && !seasonChanged && !writesChanged) {
      return {
        activeSeason,
        activeTitleKey,
        activeTitleLabel: title.label,
        archivedSessionCount: 0,
        archiveReason: null,
        configId: currentConfig._id,
        didChange: false,
        didInitialize: false,
        seasonChanged: false,
        sessionWritesEnabled: currentSessionWritesEnabled,
        titleChanged: false,
      }
    }

    const archiveReason =
      titleChanged || seasonChanged
        ? resolveArchiveReason({
            seasonChanged,
            titleChanged,
          })
        : null
    const openSessions =
      titleChanged || seasonChanged
        ? await ctx.db
            .query("sessions")
            .withIndex("by_endedAt", (query) => query.eq("endedAt", null))
            .collect()
        : []
    const openSessionCountsByUserId = countSessionsByUserId(openSessions)

    if (openSessions.length > 0) {
      await Promise.all(
        openSessions.map((session) =>
          ctx.db.patch(session._id, {
            archivedReason: archiveReason ?? undefined,
            endedAt: now,
          })
        )
      )
    }

    await ctx.db.patch(currentConfig._id, {
      activeSeason,
      activeTitleKey,
      sessionWritesEnabled: args.sessionWritesEnabled,
      updatedAt: now,
      updatedByUserId: args.updatedByUserId,
    })

    if (openSessions.length > 0) {
      await applyGlobalLandingStatsDelta(ctx, {
        activeSessions: -openSessions.length,
      })

      await Promise.all(
        Array.from(openSessionCountsByUserId.entries()).map(
          ([userId, openSessionCount]) =>
            applyUserLandingStatsDelta(ctx, userId, {
              activeSessions: -openSessionCount,
            })
        )
      )

      await ctx.scheduler.runAfter(
        0,
        internal.actions.stats.cache.invalidateLandingMetricsCache,
        {
          invalidateAll: true,
        }
      )
    }

    return {
      activeSeason,
      activeTitleKey,
      activeTitleLabel: title.label,
      archivedSessionCount: openSessions.length,
      archiveReason,
      configId: currentConfig._id,
      didChange: true,
      didInitialize: false,
      seasonChanged,
      sessionWritesEnabled: args.sessionWritesEnabled,
      titleChanged,
    }
  },
})
