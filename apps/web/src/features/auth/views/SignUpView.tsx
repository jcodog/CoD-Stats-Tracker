import { AuthShell } from "./AuthShell"
import { SignUp } from "@clerk/nextjs"

import { CreatorCodeNotice } from "@/features/creator-attribution/components/CreatorCodeNotice"
import type { PendingCreatorCodeSummary } from "@/lib/server/creator-attribution"

const signUpAppearance = {
  elements: {
    card: "w-full rounded-lg border border-border/70 bg-background shadow-none",
    cardBox: "w-full shadow-none",
    rootBox: "w-full",
  },
} as const

export function SignUpView({
  pendingCreatorCode,
}: {
  pendingCreatorCode?: PendingCreatorCodeSummary | null
}) {
  return (
    <AuthShell mode="sign-up">
      {pendingCreatorCode ? (
        <CreatorCodeNotice
          code={pendingCreatorCode.code}
          discountPercent={pendingCreatorCode.discountPercent}
          layout="stacked"
        />
      ) : null}

      <SignUp
        appearance={signUpAppearance}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </AuthShell>
  )
}
