import type { ReactNode } from "react"
import Link from "next/link"

import {
  LandingFooter,
  LandingHeader,
  MARKETING_SHELL_MAX_WIDTH,
} from "@/features/landing/components/LandingSections"
import {
  POLICY_DOCUMENTS,
  type PolicyDocument,
  type PolicySlug,
} from "@/features/policies/lib/policies"

export function MarketingPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md px-3 py-2 focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:bg-background focus-visible:text-foreground focus-visible:shadow-md"
      >
        Skip to Main Content
      </a>

      <LandingHeader />

      <main
        id="main-content"
        className={`mx-auto flex w-full ${MARKETING_SHELL_MAX_WIDTH} flex-1 flex-col overflow-x-clip px-5 pt-12 pb-16 sm:px-8 sm:pt-16 lg:px-10`}
      >
        {children}
      </main>

      <LandingFooter />
    </div>
  )
}

export function PolicyIntro({
  description,
  summary,
  title,
}: {
  description: string
  summary: string
  title: string
}) {
  return (
    <div className="grid gap-5 border-b border-border/70 pb-8">
      <div className="grid gap-3">
        <h1 className="max-w-[44rem] text-4xl leading-[0.98] font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-[42rem] text-base leading-8 text-pretty text-foreground/86 sm:text-lg">
          {description}
        </p>
      </div>
      <p className="max-w-[42rem] text-sm leading-7 text-pretty text-foreground/80 sm:text-base">
        {summary}
      </p>
    </div>
  )
}

export function PolicyDirectory({ currentSlug }: { currentSlug?: PolicySlug }) {
  return (
    <nav
      aria-label="Policy navigation"
      className={
        "max-md:grid max-md:gap-2 md:grid md:gap-2 md:lg:sticky md:lg:top-28"
      }
    >
      <div className="border-b border-border/70 pb-3">
        <div className="text-sm font-medium text-foreground">Policy index</div>
        <div className="mt-1 max-w-[18rem] text-sm leading-7 text-foreground/78">
          Public service and billing policies for CodStats.
        </div>
      </div>

      <div className="border-b border-border/70">
        {POLICY_DOCUMENTS.map((policy) => {
          const isActive = policy.slug === currentSlug

          return (
            <Link
              className={
                isActive
                  ? "block border-b border-border/70 py-3 text-sm font-medium text-foreground last:border-b-0"
                  : "block border-b border-border/70 py-3 text-sm text-foreground/78 transition-colors last:border-b-0 hover:text-foreground"
              }
              href={`/policies/${policy.slug}`}
              key={policy.slug}
            >
              {policy.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function PolicyIndexList() {
  return (
    <section className={"grid gap-4"}>
      <div className="border-b border-border/70">
        {POLICY_DOCUMENTS.map((policy) => (
          <Link
            className={
              "max-md:group md:group max-md:block max-md:border-b max-md:border-border/70 max-md:py-5 max-md:transition-colors max-md:last:border-b-0 max-md:focus-visible:rounded-md max-md:focus-visible:ring-2 max-md:focus-visible:ring-ring/80 max-md:focus-visible:outline-none md:block md:border-b md:border-border/70 md:py-6 md:transition-colors md:last:border-b-0 md:focus-visible:rounded-md md:focus-visible:ring-2 md:focus-visible:ring-ring/80 md:focus-visible:outline-none"
            }
            href={`/policies/${policy.slug}`}
            key={policy.slug}
          >
            <article className="grid gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary">
                {policy.title}
              </h2>
              <p className="max-w-[42rem] text-sm leading-7 text-foreground/80">
                {policy.description}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function PolicyMeta({ lastUpdated }: { lastUpdated: string }) {
  return (
    <div className="border-b border-border/70 pb-4 text-sm text-foreground/72">
      Last updated {lastUpdated}
    </div>
  )
}

export function PolicyBody({ policy }: { policy: PolicyDocument }) {
  return (
    <div className={"grid gap-6"}>
      <PolicyMeta lastUpdated={policy.lastUpdated} />
      <div className="border-b border-border/70">
        {policy.sections.map((section) => (
          <section
            className={
              "max-md:grid max-md:gap-3 max-md:border-b max-md:border-border/70 max-md:py-5 max-md:last:border-b-0 md:grid md:gap-3 md:border-b md:border-border/70 md:py-6 md:last:border-b-0"
            }
            key={section.title}
          >
            <h2 className="text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p
                className="max-w-[46rem] text-sm leading-7 text-foreground/84 sm:text-base"
                key={paragraph}
              >
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="grid max-w-[46rem] gap-2 text-sm leading-7 text-foreground/82 sm:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
