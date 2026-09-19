"use client"

import { UserProfile } from "@clerk/nextjs"
import { IconBrandOpenai } from "@tabler/icons-react"

import { ChatGptAppSettingsSection } from "@/features/account/components/ChatGptAppSettingsSection"

export function AccountView() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile, sign-in methods and connected apps.
        </p>
      </header>
      <UserProfile
        path="/account"
        routing="path"
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full max-w-none border border-border shadow-none",
          },
        }}
      >
        <UserProfile.Page
          label="ChatGPT App"
          labelIcon={<IconBrandOpenai className="size-4" />}
          url="chatgpt-app"
        >
          <ChatGptAppSettingsSection />
        </UserProfile.Page>
      </UserProfile>
    </div>
  )
}
