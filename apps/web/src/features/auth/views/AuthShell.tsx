import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProductBackground } from "@/components/backgrounds/ProductBackground"

export function AuthShell({
  children,
  mode,
}: {
  children: ReactNode
  mode: "sign-in" | "sign-up"
}) {
  return (
    <main className="relative grid min-h-svh bg-background lg:grid-cols-2">
      <header className="absolute inset-x-0 top-0 z-20 flex h-20 items-center justify-between gap-4 px-5 sm:px-10 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/logo.png"
            width={32}
            height={32}
            alt=""
            className="rounded-md"
          />
          CodStats
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to home
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <section
        aria-labelledby="auth-intro"
        className="relative flex min-h-64 flex-col justify-end overflow-hidden border-b border-border bg-muted/25 px-5 pt-28 pb-8 sm:px-10 lg:min-h-svh lg:border-r lg:border-b-0 lg:px-12 lg:pb-16"
      >
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,black_40%,transparent_90%)] opacity-35">
          <ProductBackground effect="dither" />
        </div>
        <div className="relative max-w-lg">
          <h1
            id="auth-intro"
            className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl"
          >
            {mode === "sign-in"
              ? "Pick up where you left off."
              : "Your next session starts here."}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Your ranked sessions, match history and progress. Together in
            CodStats.
          </p>
        </div>
      </section>
      <section
        aria-label={
          mode === "sign-in"
            ? "Sign in to CodStats"
            : "Create your CodStats account"
        }
        className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 lg:pt-28 lg:pb-14"
      >
        <div className="mx-auto grid w-full max-w-md gap-5">
          {children}
          <p className="text-center text-xs leading-6 text-muted-foreground">
            <Link
              href="/policies/privacy"
              className="underline underline-offset-4"
            >
              Privacy
            </Link>
            <span aria-hidden> · </span>
            <Link href="/policies/tos" className="underline underline-offset-4">
              Terms
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
