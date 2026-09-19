import { SignIn } from "@clerk/nextjs"

import { CreatorCodeNotice } from "@/features/creator-attribution/components/CreatorCodeNotice"
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
}: {
  pendingCreatorCode?: PendingCreatorCodeSummary | null
}) {

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background">
      <div
        className={
          "max-md:mx-auto max-md:flex max-md:w-full max-md:max-w-sm max-md:px-4 max-md:py-6 md:mx-auto md:flex md:w-full md:max-w-md md:px-6 md:py-10"
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
