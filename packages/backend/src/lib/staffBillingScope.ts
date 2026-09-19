import { v } from "convex/values"
export const staffBillingScopeValidator = v.union(
  v.literal("catalog"),
  v.literal("subscriptions"),
  v.literal("customers"),
  v.literal("creator-program"),
  v.literal("creator-access"),
  v.literal("creator-transfers")
)
export type StaffBillingScope =
  | "catalog"
  | "subscriptions"
  | "customers"
  | "creator-program"
  | "creator-access"
  | "creator-transfers"
