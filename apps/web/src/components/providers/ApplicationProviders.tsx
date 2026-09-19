"use client"

import type { ReactNode } from "react"
import ConvexClientProvider from "@/components/providers/ConvexProviderWithClerk"
import { TanstackQueryProvider } from "@/components/providers/TanstackQueryProvider"
import { Toaster } from "@workspace/ui/components/sonner"

export function ApplicationProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <TanstackQueryProvider>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </TanstackQueryProvider>
    </ConvexClientProvider>
  )
}
