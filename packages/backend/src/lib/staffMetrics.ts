export const STAFF_METRIC_KEYS = [
  "trackedUsers",
  "adminUsers",
  "staffUsers",
  "superAdminUsers",
  "activeSubscriptions",
  "attentionSubscriptions",
  "cancelAtPeriodEndCount",
  "active",
  "trialing",
  "past_due",
  "paused",
] as const
export type StaffMetrics = Record<(typeof STAFF_METRIC_KEYS)[number], number>
export function emptyStaffMetrics(): StaffMetrics {
  return {
    trackedUsers: 0,
    adminUsers: 0,
    staffUsers: 0,
    superAdminUsers: 0,
    activeSubscriptions: 0,
    attentionSubscriptions: 0,
    cancelAtPeriodEndCount: 0,
    active: 0,
    trialing: 0,
    past_due: 0,
    paused: 0,
  }
}
