import Image from "next/image"
import Link from "next/link"
import {
  IconArrowRight,
  IconChartLine,
  IconHistory,
  IconTargetArrow,
  IconUsers,
} from "@tabler/icons-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { NavbarAuthActions } from "@/features/landing/components/NavbarAuthActions"
import { PUBLIC_SITE_ANALYTICS_URL } from "@/lib/site-analytics"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const MARKETING_SHELL_MAX_WIDTH = "max-w-[80rem]"
const frame = "mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-10"

const recentMatches = [
  { map: "Vault", mode: "Hardpoint", result: "W", sr: "+55" },
  { map: "Protocol", mode: "Control", result: "L", sr: "-24" },
  { map: "Red Card", mode: "Hardpoint", result: "W", sr: "+49" },
]

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className={cn(frame, "flex min-h-16 items-center gap-5")}>
        <Link
          href="/"
          aria-label="CodStats home"
          className="flex shrink-0 items-center gap-2.5 rounded-md text-base font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/logo.png"
            alt=""
            width={30}
            height={30}
            className="rounded-md"
            priority
          />
          CodStats
        </Link>

        <nav
          aria-label="Main navigation"
          className="ml-4 hidden items-center gap-6 text-sm text-muted-foreground md:flex"
        >
          <Link
            className="transition-colors hover:text-foreground focus-visible:underline"
            href="/#product"
          >
            Product
          </Link>
          <Link
            className="transition-colors hover:text-foreground focus-visible:underline"
            href="/#creators"
          >
            Creators
          </Link>
          <Link
            className="transition-colors hover:text-foreground focus-visible:underline"
            href="/pricing"
          >
            Pricing
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <NavbarAuthActions compact />
        </div>
      </div>
    </header>
  )
}

export function LandingHeroSection() {
  return (
    <div className="relative z-10 flex min-w-0 flex-col justify-center py-4 lg:py-10">
      <h1 className="max-w-[42rem] text-5xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.75rem]">
        See the ranked night you actually played.
      </h1>

      <p className="mt-6 max-w-[39rem] text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">
        CodStats keeps every match inside the session it belongs to, so SR,
        wins, losses, maps and modes tell one story instead of becoming a pile
        of disconnected numbers.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <NavbarAuthActions context="hero" layout="responsive" />
        <Link
          href="/pricing"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-1 text-sm font-medium text-foreground/78 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
        >
          View Pricing
          <IconArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <dl className="mt-9 grid max-w-[38rem] grid-cols-1 border-y border-border/80 text-sm sm:grid-cols-3 sm:divide-x sm:divide-border/80">
        <div className="py-3 sm:pr-4">
          <dt className="text-muted-foreground">Track</dt>
          <dd className="mt-0.5 font-medium">Session by session</dd>
        </div>
        <div className="border-t border-border/80 py-3 sm:border-t-0 sm:px-4">
          <dt className="text-muted-foreground">Review</dt>
          <dd className="mt-0.5 font-medium">SR + match context</dd>
        </div>
        <div className="border-t border-border/80 py-3 sm:border-t-0 sm:pl-4">
          <dt className="text-muted-foreground">Return</dt>
          <dd className="mt-0.5 font-medium">With a real record</dd>
        </div>
      </dl>
    </div>
  )
}

export function LandingProductSection() {
  return (
    <figure
      id="product"
      className="relative z-10 min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-3 text-sm sm:px-5">
        <div>
          <span className="font-medium">Friday Ranked</span>
          <span className="ml-2 text-muted-foreground">6 matches</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Illustrative Session
        </span>
      </figcaption>

      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 border-b border-border p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="grid grid-cols-3 gap-4 border-b border-border pb-5">
            <div>
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="mt-1 font-mono text-xl font-medium tabular-nums">
                4,100
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Finished</p>
              <p className="mt-1 font-mono text-xl font-medium tabular-nums">
                4,280
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net SR</p>
              <p className="mt-1 font-mono text-xl font-medium tabular-nums text-primary">
                +180
              </p>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">SR Progression</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every result stays tied to the session.
                </p>
              </div>
              <span className="font-mono text-sm tabular-nums text-primary">
                4W · 2L
              </span>
            </div>

            <svg
              viewBox="0 0 520 176"
              role="img"
              aria-label="Illustrative SR progression from 4,100 to 4,280 over six matches"
              className="mt-5 h-44 w-full overflow-visible"
            >
              <path
                d="M0 28H520M0 88H520M0 148H520"
                fill="none"
                stroke="currentColor"
                className="text-border"
              />
              <path
                d="M0 146L104 110L208 126L312 64L416 82L520 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
                className="text-primary"
              />
              {[0, 104, 208, 312, 416, 520].map((x, index) => {
                const y = [146, 110, 126, 64, 82, 24][index]
                return (
                  <circle
                    key={x}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="currentColor"
                    className="text-primary"
                  />
                )
              })}
            </svg>
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Recent Matches</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Result, map, mode and SR together.
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              latest first
            </span>
          </div>

          <div className="mt-5 divide-y divide-border border-y border-border">
            {recentMatches.map((match) => (
              <div
                key={match.map + match.mode}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    match.result === "W"
                      ? "text-dashboard-positive"
                      : "text-dashboard-negative"
                  )}
                >
                  {match.result}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{match.map}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {match.mode}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-sm tabular-nums",
                    match.sr.startsWith("+")
                      ? "text-dashboard-positive"
                      : "text-dashboard-negative"
                  )}
                >
                  {match.sr}
                </span>
              </div>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Best Mode</dt>
              <dd className="mt-1 font-medium">Hardpoint · 3W / 1L</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Win Rate</dt>
              <dd className="mt-1 font-mono font-medium tabular-nums">67%</dd>
            </div>
          </dl>
        </div>
      </div>
    </figure>
  )
}

export function LandingFeatureList() {
  return (
    <section
      id="features"
      className="scroll-mt-28 border-t border-border pt-12 sm:pt-16"
    >
      <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
        <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          A ranked session should be easier to read than it was to play.
        </h2>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          CodStats is built around the run of matches, not a disconnected stack
          of stat cards. Log quickly, see the swing, then come back with enough
          context to remember why the numbers moved.
        </p>
      </div>

      <div className="mt-10 grid border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
        <article className="py-6 md:pr-7">
          <IconTargetArrow aria-hidden="true" className="size-5 text-primary" />
          <h3 className="mt-5 text-lg font-semibold tracking-tight">
            Log the Result
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start with win or loss and the SR change. Add map, mode and match
            detail when it is useful.
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span>Vault · Hardpoint</span>
            <span className="font-mono tabular-nums text-dashboard-positive">
              W · +55
            </span>
          </div>
        </article>

        <article className="border-t border-border py-6 md:border-t-0 md:px-7">
          <IconChartLine aria-hidden="true" className="size-5 text-primary" />
          <h3 className="mt-5 text-lg font-semibold tracking-tight">
            Read the Session
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            See the SR curve, record and recent games in one view instead of
            reconstructing the night from memory.
          </p>
          <div className="mt-5 grid grid-cols-3 border-t border-border pt-3 text-sm">
            <span>
              <span className="block text-xs text-muted-foreground">Start</span>
              <span className="font-mono tabular-nums">4,100</span>
            </span>
            <span>
              <span className="block text-xs text-muted-foreground">Peak</span>
              <span className="font-mono tabular-nums">4,325</span>
            </span>
            <span>
              <span className="block text-xs text-muted-foreground">Finish</span>
              <span className="font-mono tabular-nums">4,280</span>
            </span>
          </div>
        </article>

        <article className="border-t border-border py-6 md:border-t-0 md:pl-7">
          <IconHistory aria-hidden="true" className="size-5 text-primary" />
          <h3 className="mt-5 text-lg font-semibold tracking-tight">
            Keep the Context
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your sessions stay organized so the next review starts with your
            own record, not a vague memory of the last queue.
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span>Friday Ranked</span>
            <span className="font-mono tabular-nums">6 matches</span>
          </div>
        </article>
      </div>
    </section>
  )
}

export function LandingCreatorToolsSection() {
  const queue = [
    ["01", "Platinum", "Waiting"],
    ["02", "Gold", "Waiting"],
    ["03", "Diamond", "Next"],
  ]

  return (
    <section
      id="creators"
      className="grid scroll-mt-28 gap-10 border-b border-border pb-14 sm:pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16"
    >
      <div>
        <IconUsers aria-hidden="true" className="size-5 text-primary" />
        <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Run viewer games without running the queue in your head.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
          Creator tools keep Play With Viewers alongside the rest of CodStats:
          rank bounds, queue order, selection and invites in one workspace.
        </p>
        <Link
          href="/pricing"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "mt-6",
          })}
        >
          See Creator Pricing
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-medium">Viewer Queue</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Illustrative creator workspace
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            8 waiting
          </span>
        </div>

        <div className="grid grid-cols-2 border-b border-border bg-muted/20 text-sm">
          <div className="border-r border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Rank Range</span>
            <p className="mt-1 font-medium">Gold → Diamond</p>
          </div>
          <div className="px-5 py-3">
            <span className="text-xs text-muted-foreground">Matches Each</span>
            <p className="mt-1 font-medium">3 games</p>
          </div>
        </div>

        <ol className="divide-y divide-border">
          {queue.map(([position, rank, state]) => (
            <li
              key={position}
              className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 text-sm"
            >
              <span className="font-mono text-muted-foreground">{position}</span>
              <span className="font-medium">{rank} viewer</span>
              <span
                className={cn(
                  "text-xs",
                  state === "Next" ? "text-primary" : "text-muted-foreground"
                )}
              >
                {state}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function LandingPricingTeaser() {
  return (
    <section className="flex flex-col items-start justify-between gap-6 py-2 sm:flex-row sm:items-end">
      <div>
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">
          Start free. Upgrade when you want more from the record.
        </h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
          Compare the active plans, see the exact feature split and choose the
          level that matches how you use CodStats.
        </p>
      </div>
      <Link
        href="/pricing"
        className={buttonVariants({
          size: "lg",
          className: "shrink-0",
        })}
      >
        Compare Plans
      </Link>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/15">
      <div className={cn(frame, "grid gap-8 py-9 sm:grid-cols-[1fr_auto]")}>
        <div>
          <Link href="/" className="text-base font-semibold tracking-tight">
            CodStats
          </Link>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Session-first ranked tracking for Call of Duty.
          </p>
          <p className="mt-5 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()}{" "}
            <Link
              className="underline underline-offset-4"
              href="https://cleoai.cloud"
            >
              CleoAI
            </Link>
          </p>
        </div>

        <nav
          aria-label="Legal and transparency"
          className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-muted-foreground"
        >
          {[
            ["Terms", "tos"],
            ["Privacy", "privacy"],
            ["Cookies", "cookies"],
            ["Refunds", "refunds"],
            ["Disputes", "disputes"],
            ["GDPR", "gdpr"],
          ].map(([label, slug]) => (
            <Link
              key={slug}
              href={"/policies/" + slug}
              className="transition-colors hover:text-foreground focus-visible:underline"
            >
              {label}
            </Link>
          ))}
          <Link
            href={PUBLIC_SITE_ANALYTICS_URL}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 transition-colors hover:text-foreground focus-visible:underline"
          >
            Public Analytics ↗
          </Link>
        </nav>
      </div>
    </footer>
  )
}
