import { v } from "convex/values"

export const COMPETITIVE_RANK_VALUES = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
  "top250",
] as const

export const PARTICIPANT_RANK_VALUES = [
  ...COMPETITIVE_RANK_VALUES,
  "unknown",
] as const

export type CompetitiveRank = (typeof COMPETITIVE_RANK_VALUES)[number]
export type ParticipantRank = (typeof PARTICIPANT_RANK_VALUES)[number]

export const competitiveRankValidator = v.union(
  v.literal("bronze"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("platinum"),
  v.literal("diamond"),
  v.literal("crimson"),
  v.literal("iridescent"),
  v.literal("top250")
)

export const participantRankValidator = v.union(
  competitiveRankValidator,
  v.literal("unknown")
)

export const RANK_LABELS: Record<ParticipantRank, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  crimson: "Crimson",
  iridescent: "Iridescent",
  top250: "Top 250",
  unknown: "Unknown",
}

export const COMPETITIVE_RANK_SET = new Set<string>(COMPETITIVE_RANK_VALUES)

export function isCompetitiveRank(value: string): value is CompetitiveRank {
  return COMPETITIVE_RANK_SET.has(value.trim().toLowerCase())
}

export function parseCompetitiveRank(
  value: string | null | undefined
): CompetitiveRank | null {
  const normalized = value?.trim().toLowerCase()

  if (!normalized || !isCompetitiveRank(normalized)) {
    return null
  }

  return normalized
}

export function getParticipantRankLabel(rank: ParticipantRank): string {
  return RANK_LABELS[rank]
}
