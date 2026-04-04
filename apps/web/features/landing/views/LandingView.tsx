import { LandingDesktopView } from "@/features/landing/views/LandingDesktopView"
import { LandingMobileView } from "@/features/landing/views/LandingMobileView"
import {
  LandingBackground,
  LandingFooter,
  LandingHeader,
  MARKETING_SHELL_MAX_WIDTH,
} from "@/features/landing/components/LandingSections"
import { resolveLandingMetricsInitialState } from "@/features/landing/lib/landing-server"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export async function LandingView() {
  const [initialMetrics, viewport] = await Promise.all([
    resolveLandingMetricsInitialState(),
    resolveRequestViewport(),
  ])

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background [font-family:var(--font-geist-sans)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md px-3 py-2 focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:bg-background focus-visible:text-foreground focus-visible:shadow-md"
      >
        Skip to Main Content
      </a>

      <LandingBackground />
      <LandingHeader viewport={viewport} />

      <main
        id="main-content"
        className={`mx-auto flex w-full ${MARKETING_SHELL_MAX_WIDTH} flex-1 flex-col overflow-x-clip px-4 pt-20 pb-20 sm:px-6 sm:pt-24 lg:px-8`}
      >
        {viewport === "mobile" ? (
          <LandingMobileView initialMetrics={initialMetrics} />
        ) : (
          <LandingDesktopView initialMetrics={initialMetrics} />
        )}
      </main>

      <LandingFooter />
    </div>
  )
}
