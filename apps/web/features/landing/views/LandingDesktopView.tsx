import type { LandingMetricsResponse } from "@workspace/backend/landing/metrics"

import {
  LandingCreatorToolsSection,
  LandingFeatureList,
  LandingHeroSection,
  LandingPlatformList,
  LandingSnapshotSection,
} from "@/features/landing/components/LandingSections"

export function LandingDesktopView({
  initialMetrics,
}: {
  initialMetrics: LandingMetricsResponse | null
}) {
  return (
    <>
      <section className="grid items-start gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
        <LandingHeroSection viewport="desktop" />
        <LandingSnapshotSection
          initialMetrics={initialMetrics}
          viewport="desktop"
        />
      </section>
      <section className="mt-24 grid gap-20">
        <LandingFeatureList viewport="desktop" />
        <LandingPlatformList viewport="desktop" />
        <LandingCreatorToolsSection viewport="desktop" />
      </section>
    </>
  )
}
