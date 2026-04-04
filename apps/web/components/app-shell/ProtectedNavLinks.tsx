"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  type ProtectedNavItem,
  isProtectedNavItemActive,
} from "@/components/app-shell/protected-nav"
import { Button } from "@workspace/ui/components/button"
import { DrawerClose } from "@workspace/ui/components/drawer"
import { cn } from "@workspace/ui/lib/utils"

type ProtectedNavLinksProps = {
  items: ProtectedNavItem[]
  layout: "desktop" | "mobile"
  closeOnNavigate?: boolean
}

function ActiveIndicator({ layout }: { layout: "desktop" | "mobile" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-full bg-primary shadow-[0_0_0.9rem_hsl(var(--primary)/0.32),0_0_0.18rem_hsl(var(--primary)/0.7)] transition-opacity duration-150",
        layout === "desktop"
          ? "absolute inset-x-2 -bottom-1 h-[2px]"
          : "absolute top-2 bottom-2 left-0 w-[2px]"
      )}
    />
  )
}

export function ProtectedNavLinks({
  items,
  layout,
  closeOnNavigate = false,
}: ProtectedNavLinksProps) {
  const pathname = usePathname()

  return (
    <>
      {items.map((item) => {
        const isActive = isProtectedNavItemActive(pathname, item)

        const linkButton = (
          <Button
            asChild
            className={cn(
              "relative text-sm font-medium",
              layout === "desktop"
                ? "h-7 px-2.5 text-foreground/80 hover:text-foreground"
                : "h-11 w-full justify-start rounded-lg px-3 pl-4 text-foreground/80 hover:text-foreground",
              isActive && "text-foreground"
            )}
            size={layout === "desktop" ? "sm" : "default"}
            variant="ghost"
          >
            <Link
              aria-current={isActive ? "page" : undefined}
              href={item.href}
            >
              {isActive ? <ActiveIndicator layout={layout} /> : null}
              <span className="inline-flex items-center gap-2">
                {item.label}
              </span>
            </Link>
          </Button>
        )

        return closeOnNavigate ? (
          <DrawerClose asChild key={item.href}>
            {linkButton}
          </DrawerClose>
        ) : (
          <div key={item.href}>{linkButton}</div>
        )
      })}
    </>
  )
}
