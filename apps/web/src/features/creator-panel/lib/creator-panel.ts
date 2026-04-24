import {
  IconAffiliate,
  IconHome2,
  IconLink,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"

export const creatorPrimaryNav = [
  {
    description: "Workspace overview, program status, and creator activity.",
    exact: true,
    href: "/creator",
    icon: IconHome2,
    label: "Home",
  },
  {
    description: "Creator code, referral settings, and Stripe Connect status.",
    href: "/creator/code",
    icon: IconLink,
    label: "Creator code",
  },
] as const

export const creatorToolNav = [
  {
    description: "Queue management for creator-led viewer sessions.",
    href: "/creator/tools/playing-with-viewers",
    icon: IconUsers,
    label: "Playing with viewers",
  },
] as const

export const creatorNavigationSections = [
  {
    items: creatorPrimaryNav,
    key: "workspace",
    label: "Workspace",
  },
  {
    items: creatorToolNav,
    key: "tools",
    label: "Tools",
  },
] as const

export type CreatorBreadcrumbItem = {
  href?: string
  label: string
}

export function isCreatorRouteActive(
  pathname: string,
  href: string,
  options?: { exact?: boolean }
) {
  if (options?.exact) {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function resolveCreatorRoute(pathname: string) {
  if (pathname.startsWith("/creator/tools/playing-with-viewers")) {
    return {
      breadcrumbs: [
        { href: "/creator", label: "Home" },
        { label: "Playing with viewers" },
      ] satisfies CreatorBreadcrumbItem[],
      title: "Playing with viewers",
    }
  }

  if (pathname.startsWith("/creator/code")) {
    return {
      breadcrumbs: [
        { label: "Creator code" },
      ] satisfies CreatorBreadcrumbItem[],
      title: "Creator code",
    }
  }

  return {
    breadcrumbs: [{ label: "Home" }] satisfies CreatorBreadcrumbItem[],
    title: "Home",
  }
}

export const CREATOR_WORKSPACE_TITLE = "Creator Workspace"
export const CREATOR_WORKSPACE_ICON = IconAffiliate

export function getCreatorConnectPresentation(connectState: string) {
  if (connectState === "ready") {
    return {
      description: "Payout setup is ready.",
      indicatorClassName: "bg-emerald-500",
      label: "Ready",
      variant: "secondary" as const,
    }
  }

  if (connectState === "action_required") {
    return {
      description:
        "Stripe still needs more information before payouts can go live.",
      indicatorClassName: "bg-destructive",
      label: "Action required",
      variant: "destructive" as const,
    }
  }

  if (connectState === "review") {
    return {
      description: "Stripe setup is in review.",
      indicatorClassName: "bg-amber-500",
      label: "In review",
      variant: "outline" as const,
    }
  }

  return {
    description: "Stripe payout setup has not started yet.",
    indicatorClassName: "bg-muted-foreground/55",
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
