import { v } from "convex/values"
import type { Doc } from "../_generated/dataModel"
import {
  COMPETITIVE_RANK_VALUES,
  getParticipantRankLabel,
  competitiveRankValidator,
  participantRankValidator,
  type CompetitiveRank,
  type ParticipantRank,
} from "./rankValidator"

export { getParticipantRankLabel }

export const queueConfigRankValidator = competitiveRankValidator
export const participantQueueRankValidator = participantRankValidator

export const inviteModeValidator = v.union(
  v.literal("bot_dm"),
  v.literal("manual_creator_contact")
)

export const legacyInviteModeValidator = v.literal("discord_dm")

export const storedInviteModeValidator = v.union(
  v.literal("bot_dm"),
  v.literal("manual_creator_contact"),
  v.literal("discord_dm")
)

export const inviteCodeTypeValidator = v.union(
  v.literal("party_code"),
  v.literal("private_match_code")
)

export const queuePlatformValidator = v.union(
  v.literal("discord"),
  v.literal("twitch")
)

export const queueNotificationMethodValidator = v.union(
  v.literal("discord_dm"),
  v.literal("twitch_whisper"),
  v.literal("twitch_chat_fallback"),
  v.literal("manual_creator_contact")
)

export const queueNotificationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed")
)

export type QueueConfigRankValue = Doc<"viewerQueues">["minRank"]
export type ParticipantRankValue = Doc<"viewerQueueEntries">["rank"]
export type RankValue = QueueConfigRankValue
export type InviteMode = "bot_dm" | "manual_creator_contact"
export type StoredInviteMode = InviteMode | "discord_dm"
export type InviteCodeType = "party_code" | "private_match_code"
export type QueuePlatform = "discord" | "twitch"

type StoredQueueParticipantIdentity = {
  discordUserId?: string
  platform?: QueuePlatform
  platformUserId?: string
}

export function normalizeStoredInviteMode(
  inviteMode: StoredInviteMode
): InviteMode {
  return inviteMode === "discord_dm" ? "bot_dm" : inviteMode
}

export function normalizeStoredQueueParticipantIdentity(
  participant: StoredQueueParticipantIdentity
) {
  const platform = participant.platform
  const platformUserId = participant.platformUserId?.trim()
  const discordUserId = participant.discordUserId?.trim()

  if (platform && platformUserId) {
    return {
      discordUserId:
        platform === "discord" ? discordUserId ?? platformUserId : discordUserId,
      platform,
      platformUserId,
    }
  }

  if (discordUserId) {
    return {
      discordUserId,
      platform: "discord" as const,
      platformUserId: discordUserId,
    }
  }

  throw new Error("Stored Play With Viewers participant is missing platform identity.")
}

export function normalizeStoredQueueParticipant<
  T extends StoredQueueParticipantIdentity,
>(participant: T) {
  return {
    ...participant,
    ...normalizeStoredQueueParticipantIdentity(participant),
  }
}

export const COMPETITIVE_RANK_OPTIONS = [...COMPETITIVE_RANK_VALUES]

export const RANK_WEIGHTS: Record<CompetitiveRank, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5,
  crimson: 6,
  iridescent: 7,
  top250: 8,
}

export function isUnknownParticipantRank(
  rank: ParticipantRankValue
): rank is Extract<ParticipantRank, "unknown"> {
  return rank === "unknown"
}

export function isParticipantRankEligible(args: {
  maxRank: QueueConfigRankValue
  minRank: QueueConfigRankValue
  rank: ParticipantRankValue
}) {
  if (isUnknownParticipantRank(args.rank)) {
    return true
  }

  const weight = RANK_WEIGHTS[args.rank]
  return (
    weight >= RANK_WEIGHTS[args.minRank] && weight <= RANK_WEIGHTS[args.maxRank]
  )
}

export const DEFAULT_INVITE_CODE_TYPE: InviteCodeType = "party_code"

export const INVITE_CODE_TYPE_LABELS: Record<InviteCodeType, string> = {
  party_code: "Party code",
  private_match_code: "Private match code",
}

const INVITE_CODE_TEMPLATE_TOKEN = "{{inviteCode}}"

const INVITE_CODE_INSTRUCTION_TEMPLATES: Record<InviteCodeType, string> = {
  party_code: [
    "Open Call of Duty and head to the Social menu.",
    `Choose Join Party and enter ${INVITE_CODE_TEMPLATE_TOKEN}.`,
    "Join the party, then wait for the creator to move you into the next game.",
  ].join("\n"),
  private_match_code: [
    "Open Call of Duty and go to Private Match.",
    `Choose Join Private Match and enter ${INVITE_CODE_TEMPLATE_TOKEN}.`,
    "Load into the lobby and get ready for the match to start.",
  ].join("\n"),
}

export function getInviteCodeTypeLabel(inviteCodeType: InviteCodeType): string {
  return INVITE_CODE_TYPE_LABELS[inviteCodeType]
}

export function renderInviteCodeInstructions(args: {
  inviteCode: string
  inviteCodeType: InviteCodeType
}): string {
  const inviteCode = args.inviteCode.trim()

  return INVITE_CODE_INSTRUCTION_TEMPLATES[args.inviteCodeType].replaceAll(
    INVITE_CODE_TEMPLATE_TOKEN,
    `\`${inviteCode}\``
  )
}

export function buildInviteMessagePreview(args: {
  creatorDisplayName: string
  gameLabel: string
  inviteCode: string
  inviteCodeType: InviteCodeType
  title: string
}): string {
  const inviteCode = args.inviteCode.trim()
  const inviteCodeLabel = getInviteCodeTypeLabel(args.inviteCodeType)
  const instructions = renderInviteCodeInstructions({
    inviteCode,
    inviteCodeType: args.inviteCodeType,
  })

  return [
    `You're in for ${args.title}`,
    "You have been selected for the next Play With Viewers lobby.",
    `Creator: ${args.creatorDisplayName}`,
    `Game: ${args.gameLabel}`,
    `${inviteCodeLabel}: ${inviteCode}`,
    "Instructions:",
    instructions,
  ].join("\n")
}
