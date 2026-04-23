import {
  IconHome2,
  IconLink,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"

export const creatorPrimaryNav = [
  {
    href: "/creator",
    icon: IconHome2,
    label: "Home",
  },
  {
    href: "/creator/code",
    icon: IconLink,
    label: "Creator code",
  },
] as const

export const creatorToolNav = [
  {
    href: "/creator/tools/playing-with-viewers",
    icon: IconUsers,
    label: "Playing with viewers",
  },
] as const

export function getCreatorConnectPresentation(connectState: string) {
  if (connectState === "ready") {
    return {
      description: "Payout setup is ready.",
      label: "Ready",
      variant: "secondary" as const,
    }
  }

  if (connectState === "action_required") {
    return {
      description: "Stripe still needs more information before payouts can go live.",
      label: "Action required",
      variant: "destructive" as const,
    }
  }

  if (connectState === "review") {
    return {
      description: "Stripe setup is in review.",
      label: "In review",
      variant: "outline" as const,
    }
  }

  return {
    description: "Stripe payout setup has not started yet.",
    label: "Not started",
    variant: "outline" as const,
  }
}

export function getEstimatedPayoutPresentation(args: {
  paidConversionCount: number
  payoutEligible: boolean
}) {
  if (!args.payoutEligible) {
    return {
      detail: "Payout eligibility is paused right now.",
      value: "Paused",
    }
  }

  if (args.paidConversionCount === 0) {
    return {
      detail: "No eligible paid conversions yet.",
      value: "No estimate yet",
    }
  }

  return {
    detail: "Final amount follows billing review before payout.",
    value: `${args.paidConversionCount} pending`,
  }
}

export function formatCreatorProgramSummary(args: {
  discountPercent: number
  payoutPercent: number
}) {
  return {
    discount: `${args.discountPercent}% off the first month`,
    payout: `${args.payoutPercent}% of the first paid invoice`,
  }
}

export type CreatorNavIcon = Icon
