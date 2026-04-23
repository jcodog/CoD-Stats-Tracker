import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import { cn } from "@workspace/ui/lib/utils"
import "@workspace/ui/globals.css"
import { Toaster } from "@workspace/ui/components/sonner"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ClerkProvider } from "@/components/providers/ClerkProvider"
import ConvexClientProvider from "@/components/providers/ConvexProviderWithClerk"
import { TanstackQueryProvider } from "@/components/providers/TanstackQueryProvider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import {
  getSiteUrl,
  getStructuredData,
  socialImages,
  siteConfig,
  siteKeywords,
  siteThemeColors,
} from "@/lib/metadata/site"
import { Databuddy } from "@databuddy/sdk/react"
import { env } from "@/env/client"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: getSiteUrl("/"),
  title: {
    default: siteConfig.seoTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [
    {
      name: siteConfig.publisherName,
      url: siteConfig.publisherUrl,
    },
  ],
  creator: siteConfig.publisherName,
  publisher: siteConfig.publisherName,
  category: "gaming",
  keywords: siteKeywords,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.seoTitle,
    description: siteConfig.description,
    url: "/",
    images: [socialImages.openGraph],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.seoTitle,
    description: siteConfig.description,
    images: [socialImages.twitter.url],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  robots: {
    follow: true,
    index: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: siteThemeColors.light,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: siteThemeColors.dark,
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredData = JSON.stringify(getStructuredData())

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(fontMono.variable, "font-sans", inter.variable)}
    >
      <body className="flex h-full min-h-screen w-full min-w-full flex-col overflow-x-hidden scroll-smooth bg-background text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
        <ThemeProvider>
          <TooltipProvider>
            <ClerkProvider>
              <ConvexClientProvider>
                <TanstackQueryProvider>
                  {children}
                  <Toaster richColors position="top-right" closeButton />
                  <Databuddy
                    clientId={env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID}
                    trackHashChanges={true}
                    trackAttributes={true}
                    trackOutgoingLinks={true}
                    trackInteractions={true}
                    trackWebVitals={true}
                    trackErrors={true}
                    enableBatching
                    batchSize={50}
                    disabled={process.env.NODE_ENV !== "production"}
                  />
                </TanstackQueryProvider>
              </ConvexClientProvider>
            </ClerkProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
