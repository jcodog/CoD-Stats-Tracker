import { expect, it } from "bun:test"
import { shouldToggleTheme } from "../theme-shortcut.ts"

const keydown = {
  key: "d",
  defaultPrevented: false,
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
}
it("accepts both cases of the deliberate theme shortcut", () => {
  expect(shouldToggleTheme(keydown, false)).toBe(true)
  expect(shouldToggleTheme({ ...keydown, key: "D" }, false)).toBe(true)
  expect(shouldToggleTheme({ ...keydown, key: "a" }, false)).toBe(false)
})
it("yields to editing, composite controls and handled keyboard events", () => {
  expect(shouldToggleTheme(keydown, true)).toBe(false)
  for (const guard of [
    "defaultPrevented",
    "repeat",
    "isComposing",
    "ctrlKey",
    "altKey",
    "metaKey",
  ]) {
    expect(shouldToggleTheme({ ...keydown, [guard]: true }, false)).toBe(false)
  }
})
