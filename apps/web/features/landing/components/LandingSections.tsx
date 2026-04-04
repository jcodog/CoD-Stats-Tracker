import Link from "next/link"

import { LandingLiveStats } from "@/features/landing/components/LandingLiveStats"
import { NavbarAuthActions } from "@/features/landing/components/NavbarAuthActions"
import { PUBLIC_SITE_ANALYTICS_URL } from "@/lib/site-analytics"
import type { LandingMetricsResponse } from "@workspace/backend/landing/metrics"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"

export type LandingViewport = "desktop" | "mobile"

const dashboardReviewItems = [
  {
    title: "Session snapshot",
    description:
      "Open a session and read start SR, current SR, net SR, and win rate without digging through match history first.",
  },
  {
    title: "SR progression",
    description:
      "See how a run actually moved match by match so streaks, recoveries, and drops are obvious at a glance.",
  },
  {
    title: "Daily outcomes",
    description:
      "Review wins, losses, and daily SR gain together when you want the shape of a session instead of a single stat.",
  },
  {
    title: "Recent matches",
    description:
      "Keep the latest match log close to the rest of the dashboard so review stays fast and focused.",
  },
] as const

const platformSignalItems = [
  {
    title: "Account-linked tracking",
    detail:
      "CodStats keeps match activity tied to the signed-in account so the same data flows from live sync into the dashboard.",
  },
  {
    title: "Live ranked activity",
    detail:
      "The landing panel shows the public pulse by default, then switches to your own totals once you sign in.",
  },
  {
    title: "Built for fast review",
    detail:
      "The product is shaped around quick ranked-session reads, not raw log dumping or oversized admin-style reporting.",
  },
] as const

const creatorToolItems = [
  {
    title: "Play With Viewers queue",
    detail:
      "Creators can open a ranked viewer queue, set rank bounds, control matches per viewer, and publish the queue straight into Discord.",
  },
  {
    title: "Discord-first selection flow",
    detail:
      "Queue management, batch selection, and invite handling stay close to the creator dashboard so viewer lobbies can move without chaos.",
  },
  {
    title: "Why creators matter here",
    detail:
      "Ranked creators sit at the center of community play. Supporting them makes CodStats more useful for the wider CoD ranked ecosystem, not just the person tracking solo sessions.",
  },
] as const

export function LandingBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-[130%] rounded-full bg-sky-200/45 blur-3xl" />
      <div className="absolute -top-16 left-1/2 h-112 w-md -translate-x-[10%] rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="absolute top-64 -right-40 h-80 w-80 rounded-full bg-blue-100/55 blur-3xl" />
    </div>
  )
}

export function LandingHeader({ viewport }: { viewport: LandingViewport }) {
  const isMobileView = viewport === "mobile"

  return (
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-border/60 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div
        className={
          isMobileView
            ? "mx-auto flex min-w-0 w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6"
            : "mx-auto flex min-w-0 w-full max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8"
        }
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

        <NavbarAuthActions compact={isMobileView} />
      </div>
    </header>
  )
}

export function LandingHeroSection({ viewport }: { viewport: LandingViewport }) {
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
              ? "max-w-2xl text-[2.55rem] leading-[0.95] font-semibold tracking-tight text-balance"
              : "max-w-3xl text-5xl leading-[0.94] font-semibold tracking-tight text-balance lg:text-6xl"
          }
        >
          Track Every Match. Learn Faster. Win More.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          CodStats turns ranked sessions into a clear performance view so you can
          spot patterns and improve faster.
        </p>
      </div>

      <div className="grid gap-4">
        <NavbarAuthActions
          context="hero"
          layout={isMobileView ? "stacked" : "inline"}
        />
      </div>
    </section>
  )
}

export function LandingSnapshotSection({
  initialMetrics,
  viewport,
}: {
  initialMetrics: LandingMetricsResponse | null
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
          Live ranked activity
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          CodStats keeps ranked match totals current and account-linked, then
          expands that same data into the full dashboard once you sign in.
        </p>
      </div>

      <div className="mt-5">
        <LandingLiveStats initialData={initialMetrics} />
      </div>
    </aside>
  )
}

export function LandingFeatureList({ viewport }: { viewport: LandingViewport }) {
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
          What You Can Review Inside the Dashboard
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
          CodStats is built around ranked-session review, with the core panels
          focused on the data you actually need after a run.
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
              <p className="text-sm leading-relaxed break-words text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function LandingPlatformList({
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
          What CodStats Keeps in Sync
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
          The landing page and dashboard are reading from the same product
          system, with account-specific tracking layered in after sign in.
        </p>
      </div>

      <div className="border-y border-border/70">
        {platformSignalItems.map((item) => (
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
              <p className="text-sm leading-relaxed break-words text-muted-foreground">
                {item.detail}
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
          Creator Tools Available Now
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
          CodStats already supports ranked creators directly, because community
          queues and creator-led lobbies are a real part of how this scene
          plays.
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
              <p className="text-sm leading-relaxed break-words text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground">
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
            className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            rel="noreferrer"
            target="_blank"
          >
            Public analytics
          </Link>
          <Link
            href="/policies/tos"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Terms
          </Link>
          <Link
            href="/policies/privacy"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
