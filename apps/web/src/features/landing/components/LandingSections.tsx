import Link from "next/link"
import type { ReactElement, SVGProps } from "react"

import { NavbarAuthActions } from "@/features/landing/components/NavbarAuthActions"
import { PUBLIC_SITE_ANALYTICS_URL } from "@/lib/site-analytics"
import { ClerkIconLight } from "@workspace/ui/components/ui/svgs/clerkIconLight"
import { ClerkWordmarkDark } from "@workspace/ui/components/ui/svgs/clerkWordmarkDark"
import { Cloudflare } from "@workspace/ui/components/ui/svgs/cloudflare"
import { Convex } from "@workspace/ui/components/ui/svgs/convex"
import { ConvexWordmarkDark } from "@workspace/ui/components/ui/svgs/convexWordmarkDark"
import { NextjsIconDark } from "@workspace/ui/components/ui/svgs/nextjsIconDark"
import { NextjsLogoDark } from "@workspace/ui/components/ui/svgs/nextjsLogoDark"
import { Redis } from "@workspace/ui/components/ui/svgs/redis"
import { ShadcnUiDark } from "@workspace/ui/components/ui/svgs/shadcnUiDark"
import { Stripe } from "@workspace/ui/components/ui/svgs/stripe"
import { StripeWordmark } from "@workspace/ui/components/ui/svgs/stripeWordmark"
import { TurborepoIconDark } from "@workspace/ui/components/ui/svgs/turborepoIconDark"
import { TurborepoWordmarkDark } from "@workspace/ui/components/ui/svgs/turborepoWordmarkDark"
import { Typescript } from "@workspace/ui/components/ui/svgs/typescript"
import { VercelDark } from "@workspace/ui/components/ui/svgs/vercelDark"
import { VercelWordmarkDark } from "@workspace/ui/components/ui/svgs/vercelWordmarkDark"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type LandingViewport = "desktop" | "mobile"
export const MARKETING_SHELL_MAX_WIDTH = "max-w-[90rem]"

const MARKETING_FRAME_CLASSNAME = `mx-auto w-full ${MARKETING_SHELL_MAX_WIDTH} px-4 sm:px-6 lg:px-8`

const productSteps = [
  {
    title: "Track ranked sessions",
    description:
      "Start a ranked run, log match outcomes, and keep SR movement attached to the session you are reviewing.",
  },
  {
    title: "Review performance",
    description:
      "Use the dashboard to compare wins, losses, SR changes, recent matches, and session trends in one place.",
  },
  {
    title: "Use creator tools where relevant",
    description:
      "Creator-plan accounts can manage community tools such as Play With Viewers without a separate public creator page.",
  },
] as const

const dashboardReviewItems = [
  {
    title: "Ranked sessions",
    description:
      "Create a current ranked session and keep match logs tied to that run.",
  },
  {
    title: "Match and stat tracking",
    description:
      "Record outcomes, SR changes, maps, modes, and optional match details.",
  },
  {
    title: "Graphical stat views",
    description:
      "Review SR timelines, win/loss breakdowns, and daily performance where session data exists.",
  },
  {
    title: "Creator tools on Creator",
    description:
      "Creator-plan accounts unlock community queue tooling for ranked creators.",
  },
] as const

const creatorToolItems = [
  {
    title: "Play With Viewers queue",
    detail:
      "Creator-plan accounts can open a ranked viewer queue, set rank bounds, control matches per viewer, and publish the queue into Discord.",
  },
  {
    title: "Selection and invite flow",
    detail:
      "Queue management, batch selection, and invite handling stay close to the creator dashboard so viewer lobbies can move without chaos.",
  },
  {
    title: "Plan-gated creator workspace",
    detail:
      "Creator tools are available through the Creator plan and authenticated creator workspace, not a public creator directory.",
  },
] as const

type StackGraphic = (props: SVGProps<SVGSVGElement>) => ReactElement

const engineeringStackItems: Array<{
  Logo: StackGraphic
  logoClassName: string
  name: string
  Wordmark?: StackGraphic
  wordmarkClassName?: string
}> = [
  {
    Logo: NextjsIconDark,
    Wordmark: NextjsLogoDark,
    logoClassName: "h-10 w-10",
    name: "Next.js",
    wordmarkClassName: "h-4 w-auto",
  },
  {
    Logo: Typescript,
    logoClassName: "h-11 w-11",
    name: "TypeScript",
  },
  {
    Logo: ClerkIconLight,
    Wordmark: ClerkWordmarkDark,
    logoClassName: "h-11 w-11",
    name: "Clerk",
    wordmarkClassName: "h-4 w-auto",
  },
  {
    Logo: Convex,
    Wordmark: ConvexWordmarkDark,
    logoClassName: "h-11 w-11",
    name: "Convex",
    wordmarkClassName: "h-4 w-auto",
  },
  {
    Logo: Stripe,
    Wordmark: StripeWordmark,
    logoClassName: "h-10 w-10",
    name: "Stripe",
    wordmarkClassName: "h-4 w-auto",
  },
  {
    Logo: VercelDark,
    Wordmark: VercelWordmarkDark,
    logoClassName: "h-8 w-auto",
    name: "Vercel",
    wordmarkClassName: "h-3.5 w-auto",
  },
  {
    Logo: Cloudflare,
    logoClassName: "h-7 w-auto",
    name: "Cloudflare",
  },
  {
    Logo: TurborepoIconDark,
    Wordmark: TurborepoWordmarkDark,
    logoClassName: "h-10 w-10",
    name: "Turborepo",
    wordmarkClassName: "h-3.5 w-auto",
  },
  {
    Logo: ShadcnUiDark,
    logoClassName: "h-10 w-10",
    name: "shadcn/ui",
  },
  {
    Logo: Redis,
    logoClassName: "h-10 w-auto",
    name: "Redis",
  },
] as const

export function LandingBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/90" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.16),transparent_18rem)]" />
      <div className="absolute inset-x-0 top-0 border-t border-border/50" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-background via-background/96 to-transparent" />
    </div>
  )
}

export function LandingHeader({ viewport }: { viewport: LandingViewport }) {
  const isMobileView = viewport === "mobile"

  return (
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-border/60 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div
        className={cn(
          "flex min-w-0 items-center justify-between py-3",
          MARKETING_FRAME_CLASSNAME,
          isMobileView ? "gap-2" : "gap-6"
        )}
      >
        <Link
          href="/"
          className="group inline-flex min-w-0 shrink items-center gap-2 rounded-md text-base font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Avatar className="h-7 w-7 overflow-hidden rounded-md bg-primary/10 after:hidden">
            <AvatarImage
              src="/logo.png"
              alt="CodStats logo"
              className="rounded-none object-cover"
            />
            <AvatarFallback className="rounded-none text-[0.65rem] font-semibold">
              CS
            </AvatarFallback>
          </Avatar>
          <span className="truncate">CodStats</span>
        </Link>

        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/pricing"
            className={cn(
              "rounded-md px-2 py-1 text-sm font-medium text-foreground/82 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isMobileView && "px-1.5 text-[0.8125rem]"
            )}
          >
            Pricing
          </Link>
          <NavbarAuthActions compact={isMobileView} />
        </div>
      </div>
    </header>
  )
}

export function LandingHeroSection({
  viewport,
}: {
  viewport: LandingViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <section
      className={
        isMobileView
          ? "grid gap-7 border-b border-border/70 pb-8"
          : "grid gap-8 pt-4"
      }
    >
      <div className="grid gap-4">
        <h1
          className={
            isMobileView
              ? "max-w-[18rem] text-[2.55rem] leading-[0.95] font-semibold tracking-tight text-balance"
              : "max-w-[44rem] text-5xl leading-[0.94] font-semibold tracking-tight text-balance lg:text-6xl"
          }
        >
          Ranked sessions, match history, and creator tools in one place.
        </h1>
        <p className="max-w-[34rem] text-base leading-8 text-pretty text-foreground/84 sm:text-lg">
          CodStats helps Call of Duty ranked players track sessions, understand
          performance, and manage creator/community tools where relevant.
        </p>
      </div>

      <div
        className={
          isMobileView ? "grid gap-2" : "flex flex-wrap items-center gap-3"
        }
      >
        <NavbarAuthActions
          context="hero"
          layout={isMobileView ? "stacked" : "inline"}
        />
        <Button asChild variant="outline">
          <Link href="/pricing">View pricing</Link>
        </Button>
      </div>
    </section>
  )
}

export function LandingProductSection({
  viewport,
}: {
  viewport: LandingViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <aside
      className={
        isMobileView
          ? "border-b border-border/70 pb-8"
          : "border-l border-border/70 pl-8"
      }
    >
      <div className="grid gap-2">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          What CodStats does
        </h2>
        <p className="max-w-[30rem] text-sm leading-7 text-foreground/80">
          The product is centered on ranked review: track a session, log the
          matches that shaped it, and read the result without a noisy dashboard.
        </p>
      </div>

      <div className="mt-5 border-y border-border/70">
        {productSteps.map((item) => (
          <article
            className="grid gap-1 border-b border-border/70 py-4 last:border-b-0"
            key={item.title}
          >
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="text-sm leading-6 text-foreground/78">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </aside>
  )
}

export function LandingFeatureList({
  viewport,
}: {
  viewport: LandingViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <section
      className={
        isMobileView
          ? "grid gap-4"
          : "grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start"
      }
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          What you can do
        </h2>
        <p className="max-w-[21rem] text-sm leading-7 text-pretty text-foreground/80 sm:max-w-[23rem] sm:text-base">
          Start with match tracking, then upgrade when you need more room,
          stronger views, or creator tools.
        </p>
      </div>

      <div className="border-y border-border/70">
        {dashboardReviewItems.map((feature) => (
          <article
            key={feature.title}
            className={
              isMobileView
                ? "border-b border-border/70 py-5 last:border-b-0"
                : "border-b border-border/70 py-6 last:border-b-0"
            }
          >
            <div className="grid gap-1">
              <h3 className="text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="max-w-[44rem] text-sm leading-7 wrap-break-word text-foreground/80">
                {feature.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function LandingCreatorToolsSection({
  viewport,
}: {
  viewport: LandingViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <section
      className={
        isMobileView
          ? "grid gap-4 pb-10"
          : "grid gap-8 pb-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start"
      }
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Creator tools on Creator
        </h2>
        <p className="max-w-[21rem] text-sm leading-7 text-pretty text-foreground/80 sm:max-w-[23rem] sm:text-base">
          Creator tooling is plan-gated and account-based. It supports creator
          workflows without implying a public creator page.
        </p>
      </div>

      <div className="border-y border-border/70">
        {creatorToolItems.map((item) => (
          <article
            key={item.title}
            className={
              isMobileView
                ? "border-b border-border/70 py-5 last:border-b-0"
                : "border-b border-border/70 py-6 last:border-b-0"
            }
          >
            <div className="grid gap-1">
              <h3 className="text-lg font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="max-w-[44rem] text-sm leading-7 wrap-break-word text-foreground/80">
                {item.detail}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function LandingPricingTeaser({
  viewport,
}: {
  viewport: LandingViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <section
      className={
        isMobileView
          ? "grid gap-4 border-y border-border/70 py-6"
          : "grid gap-8 border-y border-border/70 py-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-center"
      }
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Plans stay simple
        </h2>
        <p className="max-w-[23rem] text-sm leading-7 text-foreground/80 sm:text-base">
          Premium is for deeper ranked review. Creator adds creator workspace
          tools.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[38rem] text-sm leading-7 text-foreground/80">
          Pricing is shown on the pricing page with estimated currencies where
          available. Stripe Checkout confirms the final currency, discounts,
          taxes, and total.
        </p>
        <Button asChild>
          <Link href="/pricing">View pricing</Link>
        </Button>
      </div>
    </section>
  )
}

export function LandingStackSection({
  viewport,
}: {
  viewport: LandingViewport
}) {
  const gridClassName =
    viewport === "mobile"
      ? "grid-cols-2"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"

  return (
    <section className="grid gap-6 pb-10">
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Built on tools you can inspect
        </h2>
        <p className="max-w-[42rem] text-sm leading-7 text-pretty text-foreground/78 sm:text-base">
          Open-source, typed, and built on inspectable tools.
        </p>
      </div>

      <div className="border-y border-border/70 py-8">
        <div className={cn("grid items-center gap-x-8 gap-y-8", gridClassName)}>
          {engineeringStackItems.map((item) => {
            const Logo = item.Logo
            const Wordmark = item.Wordmark

            return (
              <figure
                key={item.name}
                className="flex min-h-24 items-center justify-center"
              >
                <span className="sr-only">{item.name}</span>
                <div className="flex flex-col items-center justify-center gap-3">
                  <Logo aria-hidden="true" className={item.logoClassName} />
                  {Wordmark ? (
                    <Wordmark
                      aria-hidden="true"
                      className={item.wordmarkClassName}
                    />
                  ) : null}
                </div>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/80">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 py-5",
          MARKETING_FRAME_CLASSNAME
        )}
      >
        <p className="text-xs text-foreground/62">
          CodStats - &copy;{" "}
          <Link
            href="https://cleoai.cloud"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            CleoAI
          </Link>{" "}
          {new Date().getFullYear()}
        </p>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-4">
          <Link
            href={PUBLIC_SITE_ANALYTICS_URL}
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            rel="noreferrer"
            target="_blank"
          >
            Public analytics
          </Link>
          <Link
            href="/policies/tos"
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Terms
          </Link>
          <Link
            href="/policies/privacy"
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Privacy
          </Link>
          <Link
            href="/policies/cookies"
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cookies
          </Link>
          <Link
            href="/policies/refunds"
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Refunds
          </Link>
          <Link
            href="/policies/disputes"
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Disputes
          </Link>
          <Link
            href="/policies/gdpr"
            className="text-xs text-foreground/62 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            GDPR
          </Link>
        </nav>
      </div>
    </footer>
  )
}
