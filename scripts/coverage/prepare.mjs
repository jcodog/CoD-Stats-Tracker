import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "../..")

const bunCommand = "bun"

function runBunScript(scriptName) {
  const result = spawnSync(bunCommand, ["run", scriptName], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (process.env.VERCEL_ENV !== "preview") {
  runBunScript("coverage:clean")
  process.exit(0)
}

runBunScript("coverage")
