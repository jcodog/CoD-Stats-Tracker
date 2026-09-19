"use client"

import { UserProfile } from "@clerk/nextjs"
import { IconBrandOpenai } from "@tabler/icons-react"

import { ChatGptAppSettingsSection } from "@/features/account/components/ChatGptAppSettingsSection"

export function AccountView() {

  return (
    <div
      className={
        "max-md:flex max-md:flex-1 max-md:items-start max-md:justify-center max-md:px-0 max-md:py-2 md:flex md:flex-1 md:items-center md:justify-center"
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
