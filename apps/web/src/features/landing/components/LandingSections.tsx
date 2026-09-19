import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavbarAuthActions } from "@/features/landing/components/NavbarAuthActions"
import { PUBLIC_SITE_ANALYTICS_URL } from "@/lib/site-analytics"
import { buttonVariants } from "@workspace/ui/components/button"

export const MARKETING_SHELL_MAX_WIDTH = "max-w-[80rem]"
const frame = `mx-auto w-full ${MARKETING_SHELL_MAX_WIDTH} px-5 sm:px-8 lg:px-10`


export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div
        className={`${frame} flex min-h-18 flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3`}
      >
        <Link
          href="/"
          aria-label="CodStats home"
          className="flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="rounded-md"
          />
          CodStats
        </Link>
        <nav
          aria-label="Main navigation"
          className="order-3 flex w-full items-center gap-6 border-t border-border pt-3 text-sm text-muted-foreground sm:order-none sm:w-auto sm:border-0 sm:pt-0"
        >
          <Link
            className="hover:text-foreground focus-visible:underline"
            href="/#features"
          >
            Product
          </Link>
          <Link
            className="hover:text-foreground focus-visible:underline"
            href="/#creators"
          >
            For creators
          </Link>
          <Link
            className="hover:text-foreground focus-visible:underline"
            href="/pricing"
          >
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NavbarAuthActions compact />
        </div>
      </div>
    </header>
  )
}

export function LandingHeroSection() {
  return (
    <div className="relative z-10 flex flex-col items-start py-6 lg:py-16">
      <p className="mb-6 flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <span aria-hidden className="h-px w-8 bg-primary" />
        Your ranked record, in focus
      </p>
      <h1 className="max-w-2xl text-5xl leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
        Every session.
        <br />A clearer picture.
      </h1>
      <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">
        Know what changed between your first match and your last. Log your
        ranked games, follow your SR and find the patterns worth playing for.
      </p>
      <div className="mt-8">
        <NavbarAuthActions context="hero" layout="responsive" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Your matches. Your progress. One place to review it.
      </p>
    </div>
  )
}

export function LandingProductSection() {
  return (
    <figure className="relative z-10 min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 text-sm">
        <span className="font-medium">Ranked session</span>
        <span className="text-xs text-muted-foreground">
          Illustrative preview
        </span>
      </figcaption>
      <div className="p-5 sm:p-7">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Session SR</p>
            <p className="mt-2 font-mono text-4xl font-semibold tracking-tight">
              4,280
            </p>
          </div>
          <p className="text-sm font-medium text-primary">+180 SR</p>
        </div>
        <svg
          viewBox="0 0 440 150"
          role="img"
          aria-label="Example SR progression from 4,100 to 4,280 over six matches"
          className="mt-6 h-40 w-full overflow-visible"
        >
          <path
            d="M0 25H440M0 75H440M0 125H440"
            fill="none"
            stroke="currentColor"
            className="text-border"
          />
          <path
            d="M0 125L88 96L176 110L264 60L352 77L440 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            className="text-primary"
          />
        </svg>
        <dl className="mt-2 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
          {[
            ["Matches", "6"],
            ["Record", "4W / 2L"],
            ["Win rate", "67%"],
          ].map(([label, value]) => (
            <div key={label} className="px-3 first:pl-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-mono text-lg font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="font-medium">Latest match</span>
          <span className="text-primary">Win · +55 SR</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Match outcomes and SR changes stay tied to the session.
        </p>
      </div>
    </figure>
  )
}

export function LandingFeatureList() {
  const features = [
    [
      "Log the details that matter",
      "Record the result and SR change first. Add maps, modes and match stats when you want a deeper review.",
    ],
    [
      "See the whole session",
      "Review your SR timeline, win/loss breakdown and recent games together, with clear context for each ranked run.",
    ],
    [
      "Build a useful match history",
      "Keep your sessions organized so the next review starts with your own record, not a guess about how the night went.",
    ],
  ]
  return (
    <section
      id="features"
      className="scroll-mt-36 border-t border-border pt-12 sm:pt-16"
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-12">
        <h2 className="max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
          Less guessing.
          <br />
          More context.
        </h2>
        <p className="max-w-lg text-base leading-7 text-muted-foreground">
          A focused workspace for the games you play and the progress you want
          to understand. Start with a session, then make each match part of the
          record.
        </p>
      </div>
      <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
        {features.map(([title, description], i) => (
          <article key={title} className="border-t border-border pt-5">
            <p aria-hidden className="mb-6 font-mono text-sm text-primary">
              0{i + 1}
            </p>
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function LandingCreatorToolsSection() {
  return (
    <section
      id="creators"
      className="grid scroll-mt-36 gap-8 border-y border-border py-12 sm:py-16 md:grid-cols-2 md:gap-16"
    >
      <div>
        <p className="mb-4 text-sm font-medium text-primary">
          For ranked creators
        </p>
        <h2 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
          Keep the next lobby moving.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
          Bring Play With Viewers into your workflow. Manage the queue, choose
          your next group and keep invites organized in your creator workspace.
        </p>
        <Link
          href="/pricing"
          className={buttonVariants({ variant: "outline", className: "mt-6" })}
        >
          Explore the Creator plan
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {[
          ["Set your queue", "Choose rank bounds and matches per viewer."],
          ["Bring your community in", "Publish your queue into Discord."],
          [
            "Select, invite, play",
            "Manage selection and invites alongside the queue.",
          ],
        ].map(([title, description], i) => (
          <li key={title} className="flex gap-5 py-5 first:pt-0">
            <span
              aria-hidden
              className="pt-1 font-mono text-sm text-muted-foreground"
            >
              0{i + 1}
            </span>
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function LandingPricingTeaser() {
  return (
    <section className="flex flex-col items-start justify-between gap-6 py-4 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          Find your next step.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Compare the plans and choose the tools that fit how you play.
        </p>
      </div>
      <Link href="/pricing" className={buttonVariants({ size: "lg" })}>
        Compare plans
      </Link>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className={`${frame} grid gap-8 py-10 sm:grid-cols-[1fr_auto]`}>
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            CodStats
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            A clearer record of your ranked game.
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
              href={`/policies/${slug}`}
              className="hover:text-foreground focus-visible:underline"
            >
              {label}
            </Link>
          ))}
          <Link
            href={PUBLIC_SITE_ANALYTICS_URL}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 hover:text-foreground focus-visible:underline"
          >
            Public analytics ↗
          </Link>
        </nav>
      </div>
    </footer>
  )
}
