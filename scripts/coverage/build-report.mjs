import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "../..")
const coverageDir = path.join(rootDir, ".coverage")
const publicCoverageDir = path.join(rootDir, "apps", "web", "public", "coverage")
const reportPath = path.join(publicCoverageDir, "index.html")

const AUDITED_COVERAGE_FILES = [
  "packages/backend/src/server/chatgpt-app-contract.ts",
  "packages/backend/src/server/chatgpt-app-scopes.ts",
  "packages/backend/src/server/chatgpt-app-ui-templates.ts",
  "packages/backend/src/server/env.ts",
  "packages/backend/src/server/oauth/access-token.ts",
  "packages/backend/src/server/oauth/crypto.ts",
  "packages/backend/src/server/oauth/jwt.ts",
  "packages/backend/src/server/oauth/time.ts",
]

const auditedCoverageFileSet = new Set(AUDITED_COVERAGE_FILES)

function toPosixPath(filePath) {
  return filePath.replaceAll("\\", "/")
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function findFilesByName(dirPath, fileName, results = []) {
  if (!dirPath || !fileName) {
    return results
  }

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      findFilesByName(entryPath, fileName, results)
      continue
    }

    if (entry.isFile() && entry.name === fileName) {
      results.push(entryPath)
    }
  }

  return results
}

function shouldIncludeCoverageFile(filePath) {
  const relativePath = toPosixPath(path.relative(rootDir, filePath))

  if (!relativePath) {
    return false
  }

  if (
    relativePath.includes("/__tests__/") ||
    relativePath.includes(".test.") ||
    relativePath.includes(".spec.") ||
    relativePath.includes("/_generated/") ||
    relativePath.endsWith(".d.ts") ||
    relativePath.startsWith("scripts/")
  ) {
    return false
  }

  return (
    relativePath.startsWith("apps/web/") ||
    relativePath.startsWith("packages/backend/")
  )
}

function compressLineNumbers(lineNumbers) {
  if (lineNumbers.length === 0) {
    return "None"
  }

  const sorted = Array.from(new Set(lineNumbers)).sort((left, right) => left - right)
  const ranges = []
  let rangeStart = sorted[0]
  let previous = sorted[0]

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    if (current === previous + 1) {
      previous = current
      continue
    }

    ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`)
    rangeStart = current
    previous = current
  }

  ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`)
  return ranges.join(", ")
}

function formatPercent(covered, total) {
  if (!total) {
    return "100.00"
  }

  return ((covered / total) * 100).toFixed(2)
}

function formatCount(covered, total) {
  return `${covered}/${total}`
}

function getAreaLabel(relativePath) {
  if (relativePath.startsWith("apps/web/")) {
    return "web"
  }

  if (relativePath.startsWith("packages/backend/src/")) {
    return "backend-server"
  }

  if (relativePath.startsWith("packages/backend/convex/")) {
    return "backend-convex"
  }

  return "other"
}

function createEmptyCoverageRecord(filePath) {
  return {
    filePath,
    lines: new Map(),
    totalFunctions: 0,
    coveredFunctions: 0,
    reportedTotalLines: null,
    reportedCoveredLines: null,
  }
}

function mergeCoverageRecord(target, source) {
  for (const [lineNumber, hits] of source.lines.entries()) {
    target.lines.set(lineNumber, (target.lines.get(lineNumber) ?? 0) + hits)
  }

  target.totalFunctions = Math.max(target.totalFunctions, source.totalFunctions)
  target.coveredFunctions = Math.max(
    target.coveredFunctions,
    source.coveredFunctions
  )

  if (source.reportedTotalLines !== null) {
    target.reportedTotalLines = Math.max(
      target.reportedTotalLines ?? 0,
      source.reportedTotalLines
    )
  }

  if (source.reportedCoveredLines !== null) {
    target.reportedCoveredLines = Math.max(
      target.reportedCoveredLines ?? 0,
      source.reportedCoveredLines
    )
  }
}

function parseLcovRecord(recordText) {
  const lines = recordText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let current = null

  for (const line of lines) {
    if (line.startsWith("SF:")) {
      current = createEmptyCoverageRecord(line.slice(3))
      continue
    }

    if (!current) {
      continue
    }

    if (line.startsWith("DA:")) {
      const [lineNumberRaw, hitsRaw] = line.slice(3).split(",")
      const lineNumber = Number(lineNumberRaw)
      const hits = Number(hitsRaw)

      if (Number.isInteger(lineNumber) && Number.isFinite(hits)) {
        current.lines.set(lineNumber, hits)
      }
      continue
    }

    if (line.startsWith("FNF:")) {
      current.totalFunctions = Number(line.slice(4)) || 0
      continue
    }

    if (line.startsWith("FNH:")) {
      current.coveredFunctions = Number(line.slice(4)) || 0
      continue
    }

    if (line.startsWith("LF:")) {
      current.reportedTotalLines = Number(line.slice(3)) || 0
      continue
    }

    if (line.startsWith("LH:")) {
      current.reportedCoveredLines = Number(line.slice(3)) || 0
    }
  }

  return current
}

function readCoverageRecords() {
  const lcovPaths = findFilesByName(coverageDir, "lcov.info")

  if (lcovPaths.length === 0) {
    throw new Error(`No lcov.info files found in ${coverageDir}`)
  }

  const mergedRecords = new Map()

  for (const lcovPath of lcovPaths) {
    const raw = readFileSync(lcovPath, "utf8")
    const records = raw
      .split("end_of_record")
      .map((recordText) => parseLcovRecord(recordText))
      .filter((record) => record !== null)

    for (const record of records) {
      const filePath = path.resolve(record.filePath)

      if (!shouldIncludeCoverageFile(filePath)) {
        continue
      }

      const existing = mergedRecords.get(filePath) ?? createEmptyCoverageRecord(filePath)
      mergeCoverageRecord(existing, record)
      mergedRecords.set(filePath, existing)
    }
  }

  return Array.from(mergedRecords.values())
}

function normalizeCoverageRecord(record) {
  const relativePath = toPosixPath(path.relative(rootDir, record.filePath))
  const lineHits = Array.from(record.lines.entries())
  const totalLines = record.reportedTotalLines ?? lineHits.length
  const coveredLines =
    record.reportedCoveredLines ??
    lineHits.filter(([, hits]) => hits > 0).length
  const uncoveredLines = lineHits
    .filter(([, hits]) => hits === 0)
    .map(([lineNumber]) => lineNumber)

  return {
    area: getAreaLabel(relativePath),
    audited: auditedCoverageFileSet.has(relativePath),
    coveredFunctions: record.coveredFunctions,
    coveredLines,
    filePath: relativePath,
    totalFunctions: record.totalFunctions,
    totalLines,
    uncoveredLines,
  }
}

function summarizeRecords(records) {
  const normalizedRecords = records
    .map(normalizeCoverageRecord)
    .sort((left, right) => {
      const lineDelta =
        Number(formatPercent(left.coveredLines, left.totalLines)) -
        Number(formatPercent(right.coveredLines, right.totalLines))

      if (lineDelta !== 0) {
        return lineDelta
      }

      return left.filePath.localeCompare(right.filePath)
    })

  const totals = normalizedRecords.reduce(
    (summary, record) => {
      summary.coveredFunctions += record.coveredFunctions
      summary.coveredLines += record.coveredLines
      summary.totalFunctions += record.totalFunctions
      summary.totalLines += record.totalLines
      return summary
    },
    {
      coveredFunctions: 0,
      coveredLines: 0,
      totalFunctions: 0,
      totalLines: 0,
    }
  )

  const areaSummaries = new Map()
  for (const record of normalizedRecords) {
    const summary = areaSummaries.get(record.area) ?? {
      area: record.area,
      coveredFunctions: 0,
      coveredLines: 0,
      totalFunctions: 0,
      totalLines: 0,
    }

    summary.coveredFunctions += record.coveredFunctions
    summary.coveredLines += record.coveredLines
    summary.totalFunctions += record.totalFunctions
    summary.totalLines += record.totalLines

    areaSummaries.set(record.area, summary)
  }

  return {
    areaSummaries: Array.from(areaSummaries.values()).sort((left, right) =>
      left.area.localeCompare(right.area)
    ),
    generatedAt: new Date().toISOString(),
    records: normalizedRecords,
    totals,
  }
}

function assertAuditedCoverage(summary) {
  const auditedRecords = summary.records.filter((record) => record.audited)
  const missingFiles = AUDITED_COVERAGE_FILES.filter(
    (filePath) => !auditedRecords.some((record) => record.filePath === filePath)
  )

  if (missingFiles.length > 0) {
    throw new Error(
      `Missing audited coverage records for: ${missingFiles.join(", ")}`
    )
  }

  const underCoveredRecords = auditedRecords.filter((record) => {
    return (
      record.coveredLines !== record.totalLines ||
      record.coveredFunctions !== record.totalFunctions
    )
  })

  if (underCoveredRecords.length === 0) {
    return
  }

  const details = underCoveredRecords.map((record) => {
    return [
      record.filePath,
      `lines ${formatCount(record.coveredLines, record.totalLines)}`,
      `functions ${formatCount(record.coveredFunctions, record.totalFunctions)}`,
      `uncovered ${compressLineNumbers(record.uncoveredLines)}`,
    ].join(" | ")
  })

  throw new Error(
    `Audited preview coverage must remain 100%.\n${details.join("\n")}`
  )
}

function renderSummaryCard(title, covered, total, tone = "default") {
  const percent = formatPercent(covered, total)

  return `
    <section class="summary-card summary-card--${escapeHtml(tone)}">
      <h2>${escapeHtml(title)}</h2>
      <p class="summary-percent">${escapeHtml(percent)}%</p>
      <p class="summary-count">${escapeHtml(formatCount(covered, total))}</p>
    </section>
  `
}

function renderAreaRows(areaSummaries) {
  return areaSummaries
    .map((summary) => {
      const linePercent = formatPercent(summary.coveredLines, summary.totalLines)
      const functionPercent = formatPercent(
        summary.coveredFunctions,
        summary.totalFunctions
      )

      return `
        <tr>
          <td>${escapeHtml(summary.area)}</td>
          <td>${escapeHtml(linePercent)}%</td>
          <td>${escapeHtml(formatCount(summary.coveredLines, summary.totalLines))}</td>
          <td>${escapeHtml(functionPercent)}%</td>
          <td>${escapeHtml(
            formatCount(summary.coveredFunctions, summary.totalFunctions)
          )}</td>
        </tr>
      `
    })
    .join("")
}

function renderFileRows(records, includeAuditedColumn = false) {
  return records
    .map((record) => {
      const linePercent = formatPercent(record.coveredLines, record.totalLines)
      const functionPercent = formatPercent(
        record.coveredFunctions,
        record.totalFunctions
      )

      return `
        <tr>
          <td class="file-path">${escapeHtml(record.filePath)}</td>
          ${includeAuditedColumn ? `<td>${record.audited ? "yes" : "no"}</td>` : ""}
          <td>${escapeHtml(record.area)}</td>
          <td>${escapeHtml(linePercent)}%</td>
          <td>${escapeHtml(formatCount(record.coveredLines, record.totalLines))}</td>
          <td>${escapeHtml(functionPercent)}%</td>
          <td>${escapeHtml(
            formatCount(record.coveredFunctions, record.totalFunctions)
          )}</td>
          <td class="uncovered-lines">${escapeHtml(
            compressLineNumbers(record.uncoveredLines)
          )}</td>
        </tr>
      `
    })
    .join("")
}

function renderHtml(summary) {
  const auditedRecords = summary.records.filter((record) => record.audited)
  const auditedTotals = auditedRecords.reduce(
    (totals, record) => {
      totals.coveredFunctions += record.coveredFunctions
      totals.coveredLines += record.coveredLines
      totals.totalFunctions += record.totalFunctions
      totals.totalLines += record.totalLines
      return totals
    },
    {
      coveredFunctions: 0,
      coveredLines: 0,
      totalFunctions: 0,
      totalLines: 0,
    }
  )

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodStats Coverage</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0c111b;
        --bg-elevated: #11192a;
        --border: #24314d;
        --text: #edf2ff;
        --muted: #9eb0d0;
        --accent: #8cc3ff;
        --success: #56d39b;
        --warning: #ffd36e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Segoe UI", Inter, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(78, 145, 255, 0.18), transparent 35%),
          linear-gradient(180deg, #0b1220 0%, var(--bg) 100%);
        color: var(--text);
      }

      main {
        margin: 0 auto;
        max-width: 1280px;
        padding: 48px 24px 80px;
      }

      h1,
      h2,
      h3 {
        margin: 0;
      }

      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .lede,
      .sublede,
      .generated-at,
      .legend {
        color: var(--muted);
        line-height: 1.6;
      }

      .lede {
        margin: 16px 0 16px;
        max-width: 64rem;
      }

      .sublede {
        margin: 0 0 32px;
        max-width: 64rem;
      }

      .generated-at {
        margin: 0;
        font-size: 0.95rem;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin: 24px 0 40px;
      }

      .summary-card,
      .panel {
        border: 1px solid var(--border);
        border-radius: 20px;
        background: rgba(17, 25, 42, 0.84);
        backdrop-filter: blur(16px);
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
      }

      .summary-card {
        padding: 20px;
      }

      .summary-card--success {
        border-color: rgba(86, 211, 155, 0.3);
      }

      .summary-card h2 {
        color: var(--muted);
        font-size: 1rem;
        font-weight: 600;
      }

      .summary-percent {
        margin: 12px 0 8px;
        font-size: 2.25rem;
        font-weight: 800;
      }

      .summary-count {
        margin: 0;
        color: var(--muted);
      }

      .panel {
        overflow: hidden;
        margin-top: 24px;
      }

      .panel-header {
        padding: 18px 20px 0;
      }

      .panel-header p {
        margin: 8px 0 16px;
        color: var(--muted);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 14px 20px;
        border-top: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      td {
        font-size: 0.96rem;
      }

      tr:hover td {
        background: rgba(78, 145, 255, 0.06);
      }

      .file-path,
      .uncovered-lines {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.88rem;
      }

      .badge-row {
        display: flex;
        gap: 12px;
        margin-top: 18px;
        flex-wrap: wrap;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 0.88rem;
        font-weight: 700;
      }

      .badge--preview {
        border: 1px solid rgba(86, 211, 155, 0.28);
        background: rgba(86, 211, 155, 0.08);
        color: var(--success);
      }

      .badge--gate {
        border: 1px solid rgba(255, 211, 110, 0.28);
        background: rgba(255, 211, 110, 0.08);
        color: var(--warning);
      }

      @media (max-width: 860px) {
        main {
          padding: 32px 16px 64px;
        }

        th,
        td {
          padding: 12px 14px;
        }

        .summary-percent {
          font-size: 1.9rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Preview Coverage Report</p>
      <h1>CodStats Bun coverage</h1>
      <p class="lede">
        Preview builds publish a private coverage artifact to /coverage. The build gate is strict
        only for the audited ChatGPT connector and OAuth core surface. The rest of the Bun suite is
        still reported below so weaker areas stay visible without blocking every preview.
      </p>
      <p class="sublede">
        This page intentionally omits source listings and exposes only aggregate percentages plus
        uncovered line ranges.
      </p>
      <p class="generated-at">Generated at ${escapeHtml(summary.generatedAt)}</p>
      <div class="badge-row">
        <div class="badge badge--preview">Preview-only artifact</div>
        <div class="badge badge--gate">Audited files must stay at 100%</div>
      </div>

      <section class="panel">
        <div class="panel-header">
          <h2>Audited gate</h2>
          <p>
            These files make up the critical ChatGPT connector and OAuth contract surface that the
            preview build blocks on.
          </p>
        </div>
        <div class="summary-grid">
          ${renderSummaryCard(
            "Audited line coverage",
            auditedTotals.coveredLines,
            auditedTotals.totalLines,
            "success"
          )}
          ${renderSummaryCard(
            "Audited function coverage",
            auditedTotals.coveredFunctions,
            auditedTotals.totalFunctions,
            "success"
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Area</th>
              <th>Lines</th>
              <th>Covered lines</th>
              <th>Functions</th>
              <th>Covered functions</th>
              <th>Uncovered lines</th>
            </tr>
          </thead>
          <tbody>${renderFileRows(auditedRecords)}</tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Observed full-suite totals</h2>
          <p>
            Informational coverage across every collected web and backend source file that the Bun
            suite exercised during the preview run.
          </p>
        </div>
        <div class="summary-grid">
          ${renderSummaryCard(
            "Full-suite line coverage",
            summary.totals.coveredLines,
            summary.totals.totalLines
          )}
          ${renderSummaryCard(
            "Full-suite function coverage",
            summary.totals.coveredFunctions,
            summary.totals.totalFunctions
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Lines</th>
              <th>Covered lines</th>
              <th>Functions</th>
              <th>Covered functions</th>
            </tr>
          </thead>
          <tbody>${renderAreaRows(summary.areaSummaries)}</tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Observed file coverage</h2>
          <p>Sorted by line coverage ascending so the weakest files surface first.</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Audited</th>
              <th>Area</th>
              <th>Lines</th>
              <th>Covered lines</th>
              <th>Functions</th>
              <th>Covered functions</th>
              <th>Uncovered lines</th>
            </tr>
          </thead>
          <tbody>${renderFileRows(summary.records, true)}</tbody>
        </table>
        <p class="legend">
          Uncovered lines are shown as line-number ranges only. Full source listings are
          intentionally omitted from the published preview artifact.
        </p>
      </section>
    </main>
  </body>
</html>`
}

const records = readCoverageRecords()

if (records.length === 0) {
  throw new Error("No source coverage records were found after filtering")
}

const summary = summarizeRecords(records)
assertAuditedCoverage(summary)

mkdirSync(publicCoverageDir, { recursive: true })
writeFileSync(reportPath, renderHtml(summary), "utf8")
