import type Stripe from "stripe"

import { hasCreatorAccessFromState } from "../billingAccess"
import { parseUserRole, roleMeetsRequirement } from "../staffRoles"

export const CREATOR_PROGRAM_DEFAULTS_KEY = "global" as const

export const DEFAULT_CREATOR_PROGRAM_DEFAULTS = {
  defaultCodeActive: true,
  defaultCountry: "GB",
  defaultDiscountPercent: 10,
  defaultPayoutEligible: true,
  defaultPayoutPercent: 20,
} as const

export const CREATOR_CONNECT_LAUNCH_COUNTRIES = ["GB"] as const

export function isCreatorConnectLaunchCountry(
  value: string | null | undefined
): value is (typeof CREATOR_CONNECT_LAUNCH_COUNTRIES)[number] {
  const country = normalizeCreatorCountry(value)
  return CREATOR_CONNECT_LAUNCH_COUNTRIES.some((candidate) => candidate === country)
}

export type CreatorConnectState =
  | "action_required"
  | "not_started"
  | "ready"
  | "review"

export type CreatorConnectAccountVersion = "v1" | "v2"

const CREATOR_CODE_PATTERN = /^[A-Z0-9]{3,24}$/
const ISO_COUNTRY_PATTERN = /^[A-Z]{2}$/

function toUniqueSortedList(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))
}

export function buildCreatorCodeSeed(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24)
}

export function normalizeCreatorCode(value: string | null | undefined) {
  const normalizedCode = buildCreatorCodeSeed(value)

  if (!CREATOR_CODE_PATTERN.test(normalizedCode)) {
    return null
  }

  return normalizedCode
}

export function normalizeCreatorCountry(value: string | null | undefined) {
  const normalizedCountry = (value ?? "").trim().toUpperCase()

  if (!ISO_COUNTRY_PATTERN.test(normalizedCountry)) {
    return null
  }

  return normalizedCountry
}

export function validateCreatorPercent(args: {
  allowZero?: boolean
  label: string
  value: number
}) {
  const minimum = args.allowZero ? 0 : 1

  if (
    !Number.isInteger(args.value) ||
    args.value < minimum ||
    args.value > 100
  ) {
    throw new Error(
      `${args.label} must be a whole number between ${minimum} and 100.`
    )
  }

  return args.value
}

export function getCreatorConnectState(args: {
  detailsSubmitted?: boolean | null
  payoutsEnabled?: boolean | null
  requirementsDue?: string[] | null
  stripeConnectedAccountId?: string | null
}): CreatorConnectState {
  if (!args.stripeConnectedAccountId) {
    return "not_started"
  }

  if (
    (args.requirementsDue?.length ?? 0) > 0 ||
    args.detailsSubmitted === false
  ) {
    return "action_required"
  }

  if (args.payoutsEnabled === true) {
    return "ready"
  }

  return "review"
}

export function hasCreatorWorkspaceAccess(args: {
  fallbackPlanKey?: "creator" | "free" | "premium" | null
  hasCreatorAccount?: boolean
  state?: Parameters<typeof hasCreatorAccessFromState>[0]["state"]
  userRole?: string | null
}) {
  const normalizedRole = parseUserRole(args.userRole)

  if (normalizedRole && roleMeetsRequirement(normalizedRole, "staff")) {
    return true
  }

  return hasCreatorAccessFromState({
    fallbackPlanKey: args.fallbackPlanKey ?? undefined,
    state: args.state,
  })
}

export function getCreatorConnectPendingActions(args: {
  codeActive?: boolean
  detailsSubmitted?: boolean | null
  payoutEligible?: boolean
  payoutsEnabled?: boolean | null
  requirementsDue?: string[] | null
  requirementsPendingVerification?: string[] | null
  stripeConnectedAccountId?: string | null
}) {
  const actions: string[] = []

  if (args.codeActive === false) {
    actions.push("Your creator code is currently disabled.")
  }

  if (args.payoutEligible === false) {
    actions.push("Payout eligibility is currently paused for this account.")
  }

  if (!args.stripeConnectedAccountId) {
    actions.push("Connect Stripe to start payout setup.")
    return actions
  }

  if (args.detailsSubmitted === false) {
    actions.push("Finish Stripe onboarding to submit your payout details.")
  }

  if ((args.requirementsDue?.length ?? 0) > 0) {
    actions.push(
      `Stripe still needs ${args.requirementsDue?.length ?? 0} additional detail${(args.requirementsDue?.length ?? 0) === 1 ? "" : "s"}.`
    )
  }

  if (
    (args.requirementsPendingVerification?.length ?? 0) > 0 &&
    (args.requirementsDue?.length ?? 0) === 0
  ) {
    actions.push("Stripe is reviewing submitted payout information.")
  }

  if (
    args.payoutsEnabled === false &&
    (args.requirementsDue?.length ?? 0) === 0 &&
    (args.requirementsPendingVerification?.length ?? 0) === 0
  ) {
    actions.push(
      "Stripe is still reviewing your payout setup before payouts can go live."
    )
  }

  return actions
}

export function mapStripeConnectedAccountSnapshot(account: Stripe.Account) {
  const currentlyDue = toUniqueSortedList(account.requirements?.currently_due)
  const pastDue = toUniqueSortedList(account.requirements?.past_due)
  const pendingVerification = toUniqueSortedList(
    account.requirements?.pending_verification
  )
  const transferCapabilityStatus = account.capabilities?.transfers
  const transferCapabilityActive = transferCapabilityStatus === "active"

  return {
    // For legacy Accounts v1, receiving platform transfers depends on the
    // `transfers` capability. `charges_enabled` only means the connected
    // account can accept charges, so it is not a safe transfer readiness proxy.
    chargesEnabled: transferCapabilityActive,
    connectStatusUpdatedAt: Date.now(),
    detailsSubmitted: account.details_submitted,
    payoutsEnabled: account.payouts_enabled,
    requirementsCurrentlyDue: currentlyDue,
    requirementsDisabledReason:
      account.requirements?.disabled_reason ?? undefined,
    requirementsDue: toUniqueSortedList([...currentlyDue, ...pastDue]),
    requirementsPastDue: pastDue,
    requirementsPendingVerification: pendingVerification,
    stripeConnectedAccountId: account.id,
  }
}

type StripeAccountV2 = Stripe.V2.Core.Account
type StripeAccountV2RequirementEntry = NonNullable<
  NonNullable<StripeAccountV2["requirements"]>["entries"]
>[number]
type StripeAccountV2Capability = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<StripeAccountV2["configuration"]>["recipient"]
      >["capabilities"]
    >["stripe_balance"]
  >["stripe_transfers"]
>

function getRecipientTransferCapability(account: StripeAccountV2) {
  return (
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers ?? null
  )
}

function getRecipientPayoutCapability(account: StripeAccountV2) {
  const capabilities = account.configuration?.recipient?.capabilities

  return (
    capabilities?.stripe_balance?.payouts ??
    capabilities?.stripe_balance?.stripe_transfers ??
    null
  )
}

function getRequirementStatus(
  entry: StripeAccountV2RequirementEntry
): "currently_due" | "eventually_due" | "past_due" | null {
  return entry.minimum_deadline?.status ?? null
}

function getCapabilityStatusCodes(capability: StripeAccountV2Capability | null) {
  return (capability?.status_details ?? [])
    .map((detail) => detail.code?.trim())
    .filter((code): code is string => Boolean(code))
}

export function mapStripeConnectedAccountV2Snapshot(account: StripeAccountV2) {
  const requirementEntries = (account.requirements?.entries ?? []).filter(
    (entry): entry is StripeAccountV2RequirementEntry =>
      Boolean(entry.description?.trim())
  )
  const currentlyDue = toUniqueSortedList(
    requirementEntries
      .filter((entry) => getRequirementStatus(entry) === "currently_due")
      .map((entry) => entry.description)
  )
  const pastDue = toUniqueSortedList(
    requirementEntries
      .filter((entry) => getRequirementStatus(entry) === "past_due")
      .map((entry) => entry.description)
  )
  const pendingVerification = toUniqueSortedList(
    requirementEntries
      .filter(
        (entry) =>
          entry.awaiting_action_from === "stripe" ||
          (entry.requested_reasons ?? []).some(
            (reason) => reason.code === "routine_verification"
          )
      )
      .map((entry) => entry.description)
  )
  const payoutCapability = getRecipientPayoutCapability(account)
  const transferCapability = getRecipientTransferCapability(account)
  const capabilityCodes = [
    ...getCapabilityStatusCodes(payoutCapability),
    ...getCapabilityStatusCodes(transferCapability),
  ]
  const requirementsDue = toUniqueSortedList([...currentlyDue, ...pastDue])
  const detailsSubmitted = requirementsDue.length === 0

  return {
    // Accounts v2 recipient accounts expose transfer readiness through
    // stripe_balance.stripe_transfers, which replaces the v1 transfers
    // capability for this funds flow.
    chargesEnabled: transferCapability?.status === "active",
    connectStatusUpdatedAt: Date.now(),
    detailsSubmitted,
    payoutsEnabled: payoutCapability?.status === "active",
    requirementsCurrentlyDue: currentlyDue,
    requirementsDisabledReason:
      capabilityCodes.find((code) => code !== "requirements_pending_verification") ??
      undefined,
    requirementsDue,
    requirementsPastDue: pastDue,
    requirementsPendingVerification: pendingVerification,
    stripeConnectedAccountId: account.id,
    stripeConnectedAccountVersion: "v2" as const,
  }
}

export function formatCreatorRequirementLabel(requirement: string) {
  return requirement
    .replaceAll(".", " / ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
