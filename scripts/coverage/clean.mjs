import { rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "../..")

const pathsToClean = [
  path.join(rootDir, ".coverage"),
  path.join(rootDir, "apps", "web", "public", "coverage"),
]

for (const targetPath of pathsToClean) {
  rmSync(targetPath, { force: true, recursive: true })
}

