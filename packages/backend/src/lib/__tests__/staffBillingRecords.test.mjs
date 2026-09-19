import { expect, it } from "bun:test"
import { readAllPages } from "../staffBillingRecords.ts"

it("keeps complete billing records when database pages are short or empty", async () => {
  const cursors = []
  const rows = await readAllPages(async ({ cursor, numItems }) => {
    cursors.push(cursor)
    expect(numItems).toBe(200)
    if (cursor === null)
      return { page: [1], continueCursor: "a", isDone: false }
    if (cursor === "a") return { page: [], continueCursor: "b", isDone: false }
    return { page: [2, 3], continueCursor: "end", isDone: true }
  })
  expect(cursors).toEqual([null, "a", "b"])
  expect(rows).toEqual([1, 2, 3])
})

it("fails explicitly when a billing page cannot advance", async () => {
  await expect(
    readAllPages(async ({ cursor }) => ({
      page: [],
      continueCursor: cursor ?? "stuck",
      isDone: false,
    }))
  ).rejects.toThrow("did not advance")
})
