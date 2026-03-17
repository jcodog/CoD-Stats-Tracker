export const APP_PLAN_KEYS = ["free", "premium", "creator"] as const

export type AppPlanKey = (typeof APP_PLAN_KEYS)[number]

type BillingAccessSourceLike =
  | "none"
  | "legacy_plan"
  | "paid_subscription"
  | "creator_grant"
  | "managed_grant_subscription"
  | null
  | undefined

type BillingGrantSourceLike =
  | "creator_approval"
  | "manual"
  | "promo"
  | null
  | undefined

type BillingManagedGrantSourceLike = "creator_approval" | null | undefined

type BillingPlanDescriptorLike = {
  key?: string | null
  name?: string | null
  planType?: "free" | "paid" | null
}

export type BillingStatePlanLike = {
  accessSource?: BillingAccessSourceLike
  appPlanKey?: AppPlanKey | null
  creatorGrant?: {
    source?: BillingGrantSourceLike
  } | null
  effectivePlan?: BillingPlanDescriptorLike | null
  effectivePlanKey?: string | null
  subscription?: {
    managedGrantSource?: BillingManagedGrantSourceLike
  } | null
}

type AppPlanResolutionInput = {
  accessSource?: BillingAccessSourceLike
  effectivePlan?: BillingPlanDescriptorLike | null
  effectivePlanKey?: string | null
  fallbackPlanKey?: string | null
  grantSource?: BillingGrantSourceLike
  managedGrantSource?: BillingManagedGrantSourceLike
}

function normalizePlanIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function hasPlanToken(value: string, token: string) {
  return new RegExp(`(^|-)${token}($|-)`).test(value)
}

export function normalizeAppPlanKey(value: unknown): AppPlanKey | null {
  if (typeof value !== "string") {
    return null
  }

  const normalizedValue = normalizePlanIdentifier(value)

  if (!normalizedValue) {
    return null
  }

  if (normalizedValue === "creator" || hasPlanToken(normalizedValue, "creator")) {
    return "creator"
  }

  if (normalizedValue === "premium" || hasPlanToken(normalizedValue, "premium")) {
    return "premium"
  }

  if (normalizedValue === "free" || hasPlanToken(normalizedValue, "free")) {
    return "free"
  }

  return null
}

export function resolveAppPlanKey(
  args: AppPlanResolutionInput
): AppPlanKey {
  if (
    args.managedGrantSource === "creator_approval" ||
    args.grantSource === "creator_approval"
  ) {
    return "creator"
  }

  const directPlanKey =
    normalizeAppPlanKey(args.effectivePlan?.key) ??
    normalizeAppPlanKey(args.effectivePlanKey) ??
    normalizeAppPlanKey(args.effectivePlan?.name)

  if (directPlanKey) {
    return directPlanKey
  }

  if (
    args.effectivePlan?.planType === "paid" ||
    args.accessSource === "paid_subscription"
  ) {
    return "premium"
  }

  return normalizeAppPlanKey(args.fallbackPlanKey) ?? "free"
}

export function hasCreatorAccess(args: AppPlanResolutionInput) {
  return resolveAppPlanKey(args) === "creator"
}

export function resolveAppPlanKeyFromState(args: {
  fallbackPlanKey?: string | null
  state?: BillingStatePlanLike | null
}) {
  if (args.state?.appPlanKey) {
    return args.state.appPlanKey
  }

  return resolveAppPlanKey({
    accessSource: args.state?.accessSource,
    effectivePlan: args.state?.effectivePlan,
    effectivePlanKey: args.state?.effectivePlanKey,
    fallbackPlanKey: args.fallbackPlanKey,
    grantSource: args.state?.creatorGrant?.source,
    managedGrantSource: args.state?.subscription?.managedGrantSource,
  })
}

export function hasCreatorAccessFromState(args: {
  fallbackPlanKey?: string | null
  state?: BillingStatePlanLike | null
}) {
  return resolveAppPlanKeyFromState(args) === "creator"
}
