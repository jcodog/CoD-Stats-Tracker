import { ProductBackground } from "@/components/backgrounds/ProductBackground"
import {
  LandingCreatorToolsSection,
  LandingFeatureList,
  LandingFooter,
  LandingHeader,
  LandingHeroSection,
  LandingPricingTeaser,
  LandingProductSection,
  MARKETING_SHELL_MAX_WIDTH,
} from "@/features/landing/components/LandingSections"

export function LandingView() {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md px-3 py-2 focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:bg-background"
      >
        Skip to main content
      </a>

      <LandingHeader />

      <main
        id="main-content"
        className={"mx-auto w-full " + MARKETING_SHELL_MAX_WIDTH + " flex-1 px-5 pb-16 sm:px-8 lg:px-10"}
      >
        <section className="relative grid items-center gap-9 overflow-hidden border-b border-border/80 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-20">
          <div className="pointer-events-none absolute -inset-x-10 inset-y-0 [mask-image:linear-gradient(to_bottom,black_5%,black_70%,transparent)] opacity-40">
            <ProductBackground effect="threads" />
          </div>
          <LandingHeroSection />
          <LandingProductSection />
        </section>

        <div className="grid gap-14 pt-14 sm:gap-16 sm:pt-16">
          <LandingFeatureList />
          <LandingCreatorToolsSection />
          <LandingPricingTeaser />
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
