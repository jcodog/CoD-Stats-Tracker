"use client"

import { UserProfile } from "@clerk/nextjs"
import { IconBrandOpenai } from "@tabler/icons-react"

import { ChatGptAppSettingsSection } from "@/features/account/components/ChatGptAppSettingsSection"
import type { RequestViewport } from "@/lib/server/request-viewport"

export function AccountView({
  viewport = "desktop",
}: {
  viewport?: RequestViewport
}) {
  const isMobileView = viewport === "mobile"

  return (
    <div
      className={
        isMobileView
          ? "flex flex-1 items-start justify-center px-0 py-2"
          : "flex flex-1 items-center justify-center"
      }
    >
      <UserProfile path="/account" routing="path">
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
