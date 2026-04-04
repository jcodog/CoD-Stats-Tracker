"use client";

import { ClerkProvider as ImportedProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/themes";
import { useTheme } from "next-themes";

import { env } from "@/env/client";

interface ClerkProviderProps {
  children: React.ReactNode;
}

export const ClerkProvider = ({ children }: ClerkProviderProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <ImportedProvider
      publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        theme: resolvedTheme === "dark" ? [dark, shadcn] : [shadcn],
      }}
    >
      {children}
    </ImportedProvider>
  );
};
