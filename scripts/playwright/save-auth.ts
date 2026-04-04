import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"
import { chromium, type BrowserContext, type Page } from "playwright"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const AUTH_DIR = path.join(process.cwd(), "playwright", ".auth")
const AUTH_FILE = path.join(AUTH_DIR, "user.json")

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

async function logContextState(context: BrowserContext, page: Page) {
  const cookies = await context.cookies()
  console.log("\n[debug] Current URL:", page.url())
  console.log(
    "[debug] Cookies:",
    cookies.length > 0 ? cookies.map((c) => c.name).join(", ") : "(none)"
  )
}

async function main() {
  console.log("[save-auth] Starting...")
  console.log(`[save-auth] Base URL: ${BASE_URL}`)
  console.log(`[save-auth] Auth file: ${AUTH_FILE}`)

  fs.mkdirSync(AUTH_DIR, { recursive: true })

  console.log("[save-auth] Launching Chromium...")
  const browser = await chromium.launch({
    headless: false,
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()

  page.on("popup", (popup) => {
    console.log("[save-auth] Popup opened:", popup.url())
  })

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      console.log("[save-auth] Navigated to:", frame.url())
    }
  })

  console.log("[save-auth] Opening app...")
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })

  console.log("\n[save-auth] Manual steps:")
  console.log("1. Sign in with Discord")
  console.log("2. Wait until you are fully back inside the app")
  console.log("3. Manually open /dashboard")
  console.log("4. Refresh /dashboard once")
  console.log("5. Then come back here and press Enter\n")

  await waitForEnter(
    "[save-auth] Press Enter only when /dashboard is visibly authenticated... "
  )

  console.log("[save-auth] Re-checking dashboard...")
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await page.reload({ waitUntil: "domcontentloaded" })

  await logContextState(context, page)

  console.log("[save-auth] Saving storage state...")
  await context.storageState({ path: AUTH_FILE })

  console.log("[save-auth] Closing browser...")
  await browser.close()

  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Auth file was not created: ${AUTH_FILE}`)
  }

  const stat = fs.statSync(AUTH_FILE)
  console.log(`[save-auth] Done. Saved ${AUTH_FILE} (${stat.size} bytes)`)
}

main().catch((error) => {
  console.error("\n[save-auth] FAILED")
  console.error(error)
  process.exit(1)
})
