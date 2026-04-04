import { chromium } from "playwright"

async function main() {
  console.log("[test-open] Starting...")

  console.log("[test-open] Launching Chromium...")
  const browser = await chromium.launch({
    headless: false,
  })

  console.log("[test-open] Creating page...")
  const page = await browser.newPage()

  console.log("[test-open] Navigating...")
  await page.goto("https://example.com", {
    waitUntil: "domcontentloaded",
  })

  console.log("[test-open] SUCCESS: Browser opened and page loaded.")
  console.log("[test-open] Leave the browser open to visually confirm.")
}

main().catch((error) => {
  console.error("\n[test-open] FAILED")
  console.error(error)
  process.exit(1)
})
