import { SignIn } from "@clerk/nextjs"

import type { RequestViewport } from "@/lib/server/request-viewport"

const signInAppearance = {
  elements: {
    card: "w-full rounded-lg border border-border/70 bg-background shadow-none",
    cardBox: "w-full shadow-none",
    rootBox: "w-full",
  },
} as const

export function SignInView({
  viewport = "desktop",
}: {
  viewport?: RequestViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background">
      <div
        className={
          isMobileView
            ? "mx-auto flex w-full max-w-sm px-4 py-6"
            : "mx-auto flex w-full max-w-md px-6 py-10"
        }
      >
        <div className="w-full">
          <SignIn
            appearance={signInAppearance}
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </main>
  )
}
