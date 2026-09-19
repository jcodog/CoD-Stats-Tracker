import { expect, test } from "bun:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import ts from "typescript"

const root = resolve(import.meta.dir, "../..")
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sources(path) : /\.tsx?$/.test(path) ? [path] : []
  })
}
function imports(path) {
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true)
  const values = []
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !node.isTypeOnly && !node.importClause?.isTypeOnly) values.push(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) values.push(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return values
}
function dependencies(entries) {
  const seen = new Set()
  const dependencies = new Set()
  const pending = [...entries]
  while (pending.length) {
    const path = pending.pop()
    if (seen.has(path)) continue
    seen.add(path)
    for (const dependency of imports(path)) {
      dependencies.add(dependency)
      const base = dependency.startsWith("@/") ? join(root, dependency.slice(2)) : dependency.startsWith(".") ? resolve(dirname(path), dependency) : null
      if (!base) continue
      const target = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate))
      if (target) pending.push(target)
    }
  }
  return dependencies
}

test("public and auth route graphs do not initialize application clients", () => {
  const graph = dependencies([join(root, "app/layout.tsx"), ...sources(join(root, "app/(landing-page)")), ...sources(join(root, "app/(auth)"))])
  expect([...graph].filter((name) => /^(convex\/react|convex\/react-clerk|@tanstack\/react-query)$/.test(name))).toEqual([])
})

test("protected application graphs do not import marketing graphics", () => {
  const graph = dependencies([...sources(join(root, "app/(protected)")), ...sources(join(root, "app/(staff-protected)"))])
  expect([...graph].filter((name) => name.includes("backgrounds/ProductBackground") || name.includes("backgrounds/shaders"))).toEqual([])
})

test("server components do not use the obsolete request viewport boundary", () => {
  const callers = sources(root).filter((path) => imports(path).some((name) => name.includes("request-viewport")))
  expect(callers).toEqual([])
  expect(existsSync(join(root, "lib/server/request-viewport.ts"))).toBe(false)
})
