import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_FILE = path.join(process.cwd(), "playwright", ".auth", "user.json")

async function main() {
  console.log("[check-auth] Starting...")
  console.log(`[check-auth] Base URL: ${BASE_URL}`)
  console.log(`[check-auth] Auth file: ${AUTH_FILE}`)

  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Auth file does not exist: ${AUTH_FILE}`)
  }

  const stat = fs.statSync(AUTH_FILE)
  console.log(`[check-auth] Auth file size: ${stat.size} bytes`)

  console.log("[check-auth] Launching Chromium...")
  const browser = await chromium.launch({
    headless: false,
  })

  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      console.log("[check-auth] Navigated to:", frame.url())
    }
  })

  console.log("[check-auth] Opening dashboard...")
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await page.reload({ waitUntil: "domcontentloaded" })

  const cookies = await context.cookies()
  console.log("\n[check-auth] Final URL:", page.url())
  console.log(
    "[check-auth] Cookies:",
    cookies.length > 0 ? cookies.map((c) => c.name).join(", ") : "(none)"
  )

  console.log("\n[check-auth] Check the opened browser window.")
  console.log(
    "[check-auth] If you are on the dashboard and authenticated, it worked."
  )
  console.log("[check-auth] Press Ctrl+C when you are done inspecting.")
}

main().catch((error) => {
  console.error("\n[check-auth] FAILED")
  console.error(error)
  process.exit(1)
})
