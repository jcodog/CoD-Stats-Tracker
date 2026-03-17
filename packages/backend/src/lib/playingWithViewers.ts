import type { Doc } from "../../convex/_generated/dataModel"

export type RankValue = Doc<"viewerQueueEntries">["rank"]

export const RANK_WEIGHTS: Record<RankValue, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5,
  crimson: 6,
  iridescent: 7,
  top250: 8,
}
