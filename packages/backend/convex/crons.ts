import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval(
  "sync feature flags from vercel",
  { hours: 6 },
  internal.actions.featureFlags.sync.syncFromVercel,
  {}
)

crons.monthly(
  "process monthly creator stripe transfers",
  { day: 1, hourUTC: 8, minuteUTC: 0 },
  internal.actions.creator.payouts.runScheduledMonthlyCreatorPayoutTransfers,
  {}
)

export default crons
