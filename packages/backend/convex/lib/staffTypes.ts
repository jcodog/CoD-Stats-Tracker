import type { AppPlanKey } from "./billingAccess"
import type { CreatorConnectState } from "./creatorProgram"
import type {
  AuditLogResult,
  BillingFeatureApplyMode,
  RequiredStaffRole,
  UserRole,
} from "./staffRoles"

export type StaffAccessIssueCode =
  | "missing_clerk_role"
  | "missing_convex_token"
  | "missing_convex_user"
  | "missing_convex_role"
  | "invalid_clerk_role"
  | "invalid_convex_role"
  | "role_mismatch"
  | "insufficient_role"

export type StaffAccessViewState =
  | {
      ok: true
      requiredRole: RequiredStaffRole
      clerkRole: UserRole
      convexRole: UserRole
      clerkUserId: string
      displayName: string
      email?: string
    }
  | {
      ok: false
      requiredRole: RequiredStaffRole
      reason: StaffAccessIssueCode
      clerkRole: UserRole | null
      convexRole: UserRole | null
      clerkUserId: string
      displayName: string
      email?: string
      supportMessage: string
    }

export type StaffAuditLogEntry = {
  action: string
  actorClerkUserId: string
  actorName: string
  actorRole: UserRole
  createdAt: number
  details?: string
  entityId: string
  entityLabel?: string
  entityType: string
  id: string
  result: AuditLogResult
  summary: string
}

export type StaffManagementUserRecord = {
  clerkRole: UserRole | null
  clerkUserId: string
  convexRole: UserRole | null
  displayName: string
  email?: string
  hasConvexUser: boolean
  isReservedSuperAdmin: boolean
  isCurrentUser: boolean
  roleStatus:
    | "matched"
    | "mismatch"
    | "missing_clerk"
    | "missing_convex"
    | "missing_both"
  status: "active" | "disabled" | "unknown"
}

export type StaffManagementDashboard = {
  adminCount: number
  auditLogs: StaffAuditLogEntry[]
  currentActorClerkUserId: string
  currentActorRole: UserRole
  generatedAt: number
  staffCount: number
  superAdminCount: number
  users: StaffManagementUserRecord[]
}

export type StaffSubscriptionImpactRow = {
  attentionStatus?:
    | "none"
    | "past_due"
    | "paused"
    | "payment_failed"
    | "requires_action"
  cancelAt?: number
  cancelAtPeriodEnd: boolean
  clerkUserId: string
  currentPeriodEnd?: number
  currentPeriodStart?: number
  email?: string
  interval: "month" | "year"
  planKey: string
  scheduledChangeAt?: number
  scheduledChangeType?: "cancel" | "plan_change"
  scheduledInterval?: "month" | "year"
  scheduledPlanKey?: string
  status: string
  stripeCustomerId?: string
  stripePriceId: string
  stripeScheduleId?: string
  stripeSubscriptionId: string
  userName: string
}

export type StaffBillingPlanRecord = {
  active: boolean
  activeSubscriptionCount: number
  archivedAt?: number
  currentMonthlySubscriptionCount: number
  currentYearlySubscriptionCount: number
  currency: string
  description: string
  includedFeatureKeys: string[]
  key: string
  monthlyPriceAmount: number
  monthlyPriceId?: string
  name: string
  planType: "free" | "paid"
  sortOrder: number
  stripeProductId?: string
  syncStatus: "archived" | "attention" | "free" | "ready"
  yearlyPriceAmount: number
  yearlyPriceId?: string
}

export type StaffBillingFeatureRecord = {
  active: boolean
  activeSubscriptionCount: number
  appliesTo: BillingFeatureApplyMode
  archivedAt?: number
  category?: string
  description: string
  key: string
  linkedPlanKeys: string[]
  name: string
  sortOrder: number
  stripeFeatureId?: string
}

export type StaffBillingAssignmentRecord = {
  enabled: boolean
  featureKey: string
  planKey: string
}

export type StaffBillingAccessSource =
  | "creator_grant"
  | "legacy_plan"
  | "managed_grant_subscription"
  | "none"
  | "paid_subscription"

export type StaffBillingCustomerRecord = {
  active: boolean
  activeSubscriptionCount: number
  clerkUserId: string
  createdAt: number
  creatorAccessSource: StaffBillingAccessSource
  email?: string
  hasCreatorAccess: boolean
  hasCreatorGrant: boolean
  planKeys: string[]
  stripeCustomerId: string
  subscriptionCount: number
  updatedAt: number
  userName: string
}

export type StaffBillingUserLookupRecord = {
  accessSource: StaffBillingAccessSource
  clerkUserId: string
  currentAppPlanKey: AppPlanKey
  currentPlanKey?: string | null
  email?: string
  hasCreatorGrant: boolean
  userId: string
  userName: string
}

export type StaffCreatorGrantRecord = {
  active: boolean
  clerkUserId: string
  createdAt: number
  email?: string
  endsAt?: number
  grantedByClerkUserId?: string
  grantedByName?: string
  id: string
  planKey: string
  reason: string
  revokedAt?: number
  source: "creator_approval" | "manual" | "promo"
  startsAt?: number
  userId: string
  userName: string
}

export type StaffCreatorProgramDefaultsRecord = {
  defaultCodeActive: boolean
  defaultCountry: string
  defaultDiscountPercent: number
  defaultPayoutEligible: boolean
  defaultPayoutPercent: number
}

export type StaffCreatorProgramAccountRecord = {
  accessSource: StaffBillingAccessSource
  clerkUserId: string
  code: string
  codeActive: boolean
  connectDisabledReason?: string | null
  connectRequirementsDue: string[]
  connectState: CreatorConnectState
  connectStatusUpdatedAt?: number
  country: string
  currentAppPlanKey: AppPlanKey
  currentPlanKey?: string | null
  detailsSubmitted?: boolean | null
  discountPercent: number
  email?: string
  hasConnectedAccount: boolean
  id: string
  paidConversionCount: number
  payoutEligible: boolean
  payoutPercent: number
  payoutsEnabled?: boolean | null
  pendingVerificationCount: number
  sharePath: string
  signupCount: number
  userId: string
  userName: string
}

export type StaffWebhookEventRecord = {
  customerId?: string
  errorMessage?: string
  eventType: string
  id: string
  invoiceId?: string
  paymentIntentId?: string
  processedAt?: number
  processingStatus:
    | "failed"
    | "ignored"
    | "processed"
    | "processing"
    | "received"
  receivedAt: number
  safeSummary: string
  subscriptionId?: string
}

export type StaffWebhookTimelinePoint = {
  dayStart: number
  failedCount: number
  processedCount: number
}

export type StaffWebhookMetrics = {
  failedCount: number
  ignoredCount: number
  lastProcessedAt?: number
  lastReceivedAt?: number
  processedCount: number
  processingCount: number
  receivedCount: number
  timeline: StaffWebhookTimelinePoint[]
}

export type StaffWebhookPayloadState = "available" | "missing" | "unavailable"

export type StaffWebhookLedgerRecord = {
  customerId?: string
  errorMessage?: string
  eventType: string
  id: string
  invoiceId?: string
  payloadState: StaffWebhookPayloadState
  payloadUnavailableReason?: string
  paymentIntentId?: string
  processedAt?: number
  processingStatus:
    | "failed"
    | "ignored"
    | "processed"
    | "processing"
    | "received"
  receivedAt: number
  safeSummary: string
  stripeEventId: string
  subscriptionId?: string
}

export type StaffWebhookEventDetail = StaffWebhookLedgerRecord & {
  payloadJson?: string
}

export type StaffWebhookLedgerDashboard = {
  events: StaffWebhookLedgerRecord[]
  generatedAt: number
  metrics: StaffWebhookMetrics & {
    missingPayloadCount: number
    totalCount: number
    unavailablePayloadCount: number
  }
}

export type StaffBillingSyncSummary = {
  result: AuditLogResult
  summary: string
  syncedAt: number
  warningCount: number
}

export type StaffBillingDashboard = {
  activeSubscriptionCount: number
  attentionSubscriptions: StaffSubscriptionImpactRow[]
  activeCustomerCount: number
  assignments: StaffBillingAssignmentRecord[]
  auditLogs: StaffAuditLogEntry[]
  creatorGrants: StaffCreatorGrantRecord[]
  creatorProgramAccounts: StaffCreatorProgramAccountRecord[]
  creatorProgramDefaults: StaffCreatorProgramDefaultsRecord | null
  customers: StaffBillingCustomerRecord[]
  features: StaffBillingFeatureRecord[]
  generatedAt: number
  lastSync: StaffBillingSyncSummary | null
  plans: StaffBillingPlanRecord[]
  subscriptions: StaffSubscriptionImpactRow[]
  userDirectory: StaffBillingUserLookupRecord[]
  webhookEvents: StaffWebhookEventRecord[]
  webhookMetrics: StaffWebhookMetrics
}

export type StaffOverviewStatusCount = {
  count: number
  status: "active" | "past_due" | "paused" | "trialing"
}

export type StaffOverviewTimelinePoint = {
  count: number
  dayStart: number
}

export type StaffOverviewDashboard = {
  actorRole: UserRole
  activityTimeline: StaffOverviewTimelinePoint[]
  cancelAtPeriodEndCount: number
  counts: {
    activeSubscriptions: number
    adminUsers: number
    attentionSubscriptions: number
    billingFeatures: number
    billingPlans: number
    staffUsers: number
    superAdminUsers: number
    syncAttentionPlans: number
    trackedUsers: number
  }
  generatedAt: number
  lastSync: StaffBillingSyncSummary | null
  recentActivity: StaffAuditLogEntry[]
  subscriptionStatusCounts: StaffOverviewStatusCount[]
}

export type StaffImpactPreview = {
  confirmationToken?: string
  counts: {
    activeCustomers: number
    activeSubscriptions: number
    affectedPlans: number
    affectedUsers: number
  }
  impactedSubscriptions: StaffSubscriptionImpactRow[]
  summary: string
  warnings: string[]
}

export type StaffMutationResponse = {
  requiresSessionRefresh?: boolean
  summary: string
  syncSummary?: StaffBillingSyncSummary | null
}

export type StaffRankedTitleRecord = {
  activeMapCount: number
  activeModeCount: number
  isActive: boolean
  key: string
  label: string
  mapCount: number
  modeCount: number
  sortOrder: number
}

export type StaffRankedModeRecord = {
  id: string
  isActive: boolean
  key: string
  label: string
  sortOrder: number
  titleKey: string
  titleLabel: string
  updatedAt: number
}

export type StaffRankedMapRecord = {
  id: string
  isActive: boolean
  name: string
  normalizedName: string
  sortOrder: number
  supportedModeIds: string[]
  supportedModeLabels: string[]
  titleKey: string
  titleLabel: string
  updatedAt: number
}

export type StaffRankedCurrentConfig = {
  activeSeason: number
  activeTitleKey: string
  activeTitleLabel: string
  openSessionCount: number
  sessionWritesEnabled: boolean
  updatedAt: number
}

export type StaffRankedDashboard = {
  actorRole: UserRole
  currentConfig: StaffRankedCurrentConfig | null
  generatedAt: number
  maps: StaffRankedMapRecord[]
  modes: StaffRankedModeRecord[]
  openSessionCount: number
  titles: StaffRankedTitleRecord[]
}
