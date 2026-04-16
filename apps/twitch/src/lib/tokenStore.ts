import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type StoredTwitchToken = {
  accessToken: string
  expiresIn: number
  obtainmentTimestamp: number
  refreshToken: string
  scope: string[]
}

export class FileBackedTokenStore {
  public constructor(private readonly filePath: string) {}

  public async read(): Promise<StoredTwitchToken | null> {
    try {
      const contents = await readFile(this.filePath, "utf8")
      const parsed = JSON.parse(contents) as Partial<StoredTwitchToken>

      if (
        typeof parsed.accessToken !== "string" ||
        typeof parsed.refreshToken !== "string" ||
        typeof parsed.obtainmentTimestamp !== "number" ||
        typeof parsed.expiresIn !== "number" ||
        !Array.isArray(parsed.scope)
      ) {
        return null
      }

      return {
        accessToken: parsed.accessToken,
        expiresIn: parsed.expiresIn,
        obtainmentTimestamp: parsed.obtainmentTimestamp,
        refreshToken: parsed.refreshToken,
        scope: parsed.scope.filter(
          (scope): scope is string => typeof scope === "string"
        ),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null
      }

      throw error
    }
  }

  public async write(token: StoredTwitchToken): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(token, null, 2))
  }
}
