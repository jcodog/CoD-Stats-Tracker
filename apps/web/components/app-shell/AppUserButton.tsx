"use client"

import { IconShieldLock } from "@tabler/icons-react"

import { UserButton } from "@clerk/nextjs"

export function AppUserButton({
  showStaffConsoleLink = false,
}: {
  showStaffConsoleLink?: boolean
}) {
  return (
    <UserButton
      showName
      userProfileMode="navigation"
      userProfileUrl="/account"
      appearance={{
        elements: {
          userButtonTrigger:
            "outline-none! ring-0! shadow-none! focus:ring-0! focus-visible:ring-0! focus-visible:outline-none! active:ring-0! active:outline-none! data-[state=open]:ring-0! data-[state=open]:shadow-none!",
          userButtonBox: "gap-2! pl-2!",
        },
      }}
    >
      <UserButton.MenuItems>
        {showStaffConsoleLink ? (
          <UserButton.Link
            href="/staff"
            label="Staff console"
            labelIcon={
              <IconShieldLock
                aria-hidden="true"
                data-icon="inline-start"
                className="size-4"
              />
            }
          />
        ) : null}
      </UserButton.MenuItems>
    </UserButton>
  )
}
