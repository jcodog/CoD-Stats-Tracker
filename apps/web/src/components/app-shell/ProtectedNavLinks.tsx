"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  type ProtectedNavItem,
  isProtectedNavItemActive,
} from "@/components/app-shell/protected-nav"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ProtectedNavLinksProps = {
  items: ProtectedNavItem[]
  layout: "desktop" | "mobile"
}

function ActiveIndicator({ layout }: { layout: "desktop" | "mobile" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-primary transition-opacity duration-150",
        layout === "desktop"
          ? "absolute inset-x-2 -bottom-1 h-0.5"
          : "absolute top-2 bottom-2 left-0 w-0.5"
      )}
    />
  )
}

export function ProtectedNavLinks({ items, layout }: ProtectedNavLinksProps) {
  const pathname = usePathname()

  return (
    <>
      {items.map((item) => {
        const isActive = isProtectedNavItemActive(pathname, item)

        const linkButton = (
          <Link
            aria-current={isActive ? "page" : undefined}
            href={item.href}
            className={buttonVariants({
              className: cn(
                "relative text-sm font-medium",
                layout === "desktop"
                  ? "h-9 px-3 text-foreground/80 hover:text-foreground"
                  : "h-11 w-full justify-start rounded-lg px-3 pl-4 text-foreground/80 hover:text-foreground",
                isActive && "text-foreground"
              ),
              size: layout === "desktop" ? "sm" : "default",
              variant: "ghost",
            })}
          >
            {isActive ? <ActiveIndicator layout={layout} /> : null}
            <span className="inline-flex items-center gap-2">{item.label}</span>
          </Link>
        )

        return <div key={item.href}>{linkButton}</div>
      })}
    </>
  )
}
