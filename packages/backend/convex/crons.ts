import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.monthly(
  "process monthly creator stripe transfers",
  { day: 1, hourUTC: 8, minuteUTC: 0 },
  internal.actions.creator.payouts.scheduled.runScheduledMonthlyCreatorPayoutTransfers,
  {}
)

export default crons
