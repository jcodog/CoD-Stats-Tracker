"use client"

import * as React from "react"
import { shouldToggleTheme } from "@/lib/client/theme-shortcut"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

// Let focused controls and overlays own their keyboard interactions.
const keyboardControlSelector = [
  "input",
  "textarea",
  "select",
  "dialog",
  "[role='radiogroup']",
  "[role='toolbar']",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='combobox']",
  "[role='listbox']",
  "[role='menu']",
  "[role='menubar']",
  "[role='dialog']",
  "[role='alertdialog']",
  "[role='grid']",
  "[role='tree']",
  "[role='tablist']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='textbox']",
  "[aria-haspopup]",
  "[data-theme-shortcut='off']",
].join(",")

function ThemeShortcut() {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (forcedTheme) return
      const elements = [...event.composedPath(), document.activeElement]
      const insideKeyboardControl = elements.some(
        (element) =>
          element instanceof Element && element.closest(keyboardControlSelector)
      )
      if (!shouldToggleTheme(event, insideKeyboardControl)) return
      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [forcedTheme, resolvedTheme, setTheme])
  return null
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeShortcut />
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
