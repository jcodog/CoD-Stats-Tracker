import { defineTable } from "convex/server"
import { v } from "convex/values"

export const creatorProgramDefaults = defineTable({
  key: v.literal("global"),
  defaultCodeActive: v.boolean(),
  defaultCountry: v.string(),
  defaultDiscountPercent: v.number(),
  defaultPayoutEligible: v.boolean(),
  defaultPayoutPercent: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_key", ["key"])
