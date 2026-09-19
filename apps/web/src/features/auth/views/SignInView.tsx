import { AuthShell } from "./AuthShell"
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
    <AuthShell mode="sign-in">
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
    </AuthShell>
  )
}
