"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { IconX } from "@tabler/icons-react"

const DialogViewportContext = React.createContext(false)

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const isMobile = useIsMobile()

  return (
    <DialogViewportContext.Provider value={isMobile}>
      {isMobile ? (
        <Drawer
          data-slot="dialog"
          {...(props as React.ComponentProps<typeof Drawer>)}
        />
      ) : (
        <DialogPrimitive.Root data-slot="dialog" {...props} />
      )}
    </DialogViewportContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerTrigger
        data-slot="dialog-trigger"
        {...(props as React.ComponentProps<typeof DrawerTrigger>)}
      />
    )
  }

  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerPortal
        data-slot="dialog-portal"
        {...(props as React.ComponentProps<typeof DrawerPortal>)}
      />
    )
  }

  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerClose
        data-slot="dialog-close"
        {...(props as React.ComponentProps<typeof DrawerClose>)}
      />
    )
  }

  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerOverlay
        className={className}
        data-slot="dialog-overlay"
        {...(props as React.ComponentProps<typeof DrawerOverlay>)}
      />
    )
  }

  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerContent
        data-slot="dialog-content"
        className={cn("gap-4", className)}
        {...(props as React.ComponentProps<typeof DrawerContent>)}
      >
        {children}
        {showCloseButton ? (
          <DrawerClose asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2"
              size="icon-sm"
            >
              <IconX />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        ) : null}
      </DrawerContent>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2"
              size="icon-sm"
            >
              <IconX
              />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerHeader
        data-slot="dialog-header"
        className={className}
        {...props}
      />
    )
  }

  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerFooter
        data-slot="dialog-footer"
        className={className}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        ) : null}
      </DrawerFooter>
    )
  }

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/96 px-4 py-4 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerTitle
        data-slot="dialog-title"
        className={className}
        {...(props as React.ComponentProps<typeof DrawerTitle>)}
      />
    )
  }

  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const isMobile = React.useContext(DialogViewportContext)

  if (isMobile) {
    return (
      <DrawerDescription
        data-slot="dialog-description"
        className={cn(
          "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
          className
        )}
        {...(props as React.ComponentProps<typeof DrawerDescription>)}
      />
    )
  }

  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
