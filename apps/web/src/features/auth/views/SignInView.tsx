import { SignIn } from "@clerk/nextjs"

import { CreatorCodeNotice } from "@/features/creator-attribution/components/CreatorCodeNotice"
import type { RequestViewport } from "@/lib/server/request-viewport"
import type { PendingCreatorCodeSummary } from "@/lib/server/creator-attribution"

const signInAppearance = {
  elements: {
    card: "w-full rounded-lg border border-border/70 bg-background shadow-none",
    cardBox: "w-full shadow-none",
    rootBox: "w-full",
  },
} as const

export function SignInView({
  pendingCreatorCode,
  viewport = "desktop",
}: {
  pendingCreatorCode?: PendingCreatorCodeSummary | null
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
        <div className="grid w-full gap-4">
          {pendingCreatorCode ? (
            <CreatorCodeNotice
              code={pendingCreatorCode.code}
              discountPercent={pendingCreatorCode.discountPercent}
              layout="stacked"
            />
          ) : null}

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
