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
  "apps/web/app/(chatgpt-app-connector)/debug/chatgpt-app-config/route.ts",
  "apps/web/app/(chatgpt-app-connector)/mcp/route.ts",
  "apps/web/app/(chatgpt-app-connector)/oauth/authorize/route.ts",
  "apps/web/app/(chatgpt-app-connector)/ui/codstats/matches.html/route.ts",
  "apps/web/app/(chatgpt-app-connector)/ui/codstats/rank.html/route.ts",
  "apps/web/app/(chatgpt-app-connector)/ui/codstats/session.html/route.ts",
  "apps/web/app/(chatgpt-app-connector)/ui/codstats/settings.html/route.ts",
  "apps/web/app/(chatgpt-app-connector)/ui/codstats/widget.html/route.ts",
  "apps/web/app/.well-known/(chatgpt-app-connector)/oauth-authorization-server/route.ts",
  "apps/web/app/.well-known/(chatgpt-app-connector)/openid-configuration/route.ts",
  "apps/web/app/.well-known/(chatgpt-app-connector)/oauth-protected-resource/route.ts",
  "apps/web/app/.well-known/(chatgpt-app-connector)/oauth-protected-resource/mcp/route.ts",
  "packages/backend/src/server/chatgpt-app-contract.ts",
  "packages/backend/src/server/chatgpt-app-scopes.ts",
  "packages/backend/src/server/chatgpt-app-ui-templates.ts",
  "packages/backend/src/server/env.ts",
  "packages/backend/src/server/oauth/access-token.ts",
  "packages/backend/src/server/oauth/config.ts",
  "packages/backend/src/server/oauth/crypto.ts",
  "packages/backend/src/server/oauth/jwt.ts",
  "packages/backend/src/server/oauth/time.ts",
  "packages/backend/src/server/widget-meta.ts",
]

const CONNECTOR_WATCHLIST_FILES = [
  "apps/web/app/(chatgpt-app-connector)/oauth/revoke/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/disconnect/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/profile/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/stats/matches/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/stats/matches/[id]/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/stats/rank/ladder/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/stats/rank/progress/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/stats/session/current/route.ts",
  "apps/web/app/api/(chatgpt-app-connector)/app/stats/session/last/route.ts",
  "packages/backend/src/server/chatgpt-app-mcp.ts",
  "packages/backend/src/server/redis.ts",
]

const auditedCoverageFileSet = new Set(AUDITED_COVERAGE_FILES)
const connectorWatchlistFileSet = new Set(CONNECTOR_WATCHLIST_FILES)

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

function formatTimestamp(timestamp) {
  return `${new Date(timestamp).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`
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
    source.coveredFunctions,
  )

  if (source.reportedTotalLines !== null) {
    target.reportedTotalLines = Math.max(
      target.reportedTotalLines ?? 0,
      source.reportedTotalLines,
    )
  }

  if (source.reportedCoveredLines !== null) {
    target.reportedCoveredLines = Math.max(
      target.reportedCoveredLines ?? 0,
      source.reportedCoveredLines,
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
    watchlist: connectorWatchlistFileSet.has(relativePath),
    coveredFunctions: record.coveredFunctions,
    coveredLines,
    filePath: relativePath,
    totalFunctions: record.totalFunctions,
    totalLines,
    uncoveredLines,
  }
}

function compareByCoverage(left, right) {
  const lineDelta =
    Number(formatPercent(left.coveredLines, left.totalLines)) -
    Number(formatPercent(right.coveredLines, right.totalLines))

  if (lineDelta !== 0) {
    return lineDelta
  }

  return left.filePath.localeCompare(right.filePath)
}

function sumRecords(records) {
  return records.reduce(
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
    },
  )
}

function summarizeRecords(records) {
  const normalizedRecords = records
    .map(normalizeCoverageRecord)
    .sort(compareByCoverage)

  const totals = sumRecords(normalizedRecords)
  const auditedRecords = normalizedRecords.filter((record) => record.audited)
  const watchlistRecords = normalizedRecords.filter((record) => record.watchlist)

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
      left.area.localeCompare(right.area),
    ),
    auditedRecords,
    auditedTotals: sumRecords(auditedRecords),
    generatedAt: new Date().toISOString(),
    records: normalizedRecords,
    totals,
    watchlistRecords,
    watchlistTotals: sumRecords(watchlistRecords),
  }
}

function assertAuditedCoverage(summary) {
  const missingFiles = AUDITED_COVERAGE_FILES.filter(
    (filePath) => !summary.auditedRecords.some((record) => record.filePath === filePath),
  )

  if (missingFiles.length > 0) {
    throw new Error(`Missing audited coverage records for: ${missingFiles.join(", ")}`)
  }

  const underCoveredRecords = summary.auditedRecords.filter((record) => {
    return (
      record.coveredLines !== record.totalLines ||
      record.coveredFunctions !== record.totalFunctions
    )
  })

  if (underCoveredRecords.length === 0) {
    return
  }

  const details = underCoveredRecords.map((record) =>
    [
      record.filePath,
      `lines ${formatCount(record.coveredLines, record.totalLines)}`,
      `functions ${formatCount(record.coveredFunctions, record.totalFunctions)}`,
      `uncovered ${compressLineNumbers(record.uncoveredLines)}`,
    ].join(" | "),
  )

  throw new Error(`Audited preview coverage must remain 100%.\n${details.join("\n")}`)
}

function getCoverageTone(record) {
  if (record.coveredLines === record.totalLines && record.coveredFunctions === record.totalFunctions) {
    return "perfect"
  }

  const linePercent = Number(formatPercent(record.coveredLines, record.totalLines))

  if (linePercent >= 85) {
    return "strong"
  }

  if (linePercent >= 70) {
    return "watch"
  }

  return "risk"
}

function renderMetricCard(title, covered, total, caption, tone = "default") {
  return `
    <article class="metric metric--${escapeHtml(tone)}">
      <span class="metric__label">${escapeHtml(title)}</span>
      <strong class="metric__percent">${escapeHtml(formatPercent(covered, total))}%</strong>
      <span class="metric__count">${escapeHtml(formatCount(covered, total))}</span>
      <p class="metric__caption">${escapeHtml(caption)}</p>
    </article>
  `
}

function renderAuditedRows(records) {
  return records
    .map((record) => `
      <tr>
        <td class="file-path">${escapeHtml(record.filePath)}</td>
        <td>${escapeHtml(record.area)}</td>
        <td class="cell--good">${escapeHtml(formatPercent(record.coveredLines, record.totalLines))}%</td>
        <td>${escapeHtml(formatCount(record.coveredLines, record.totalLines))}</td>
        <td class="cell--good">${escapeHtml(formatPercent(record.coveredFunctions, record.totalFunctions))}%</td>
        <td>${escapeHtml(formatCount(record.coveredFunctions, record.totalFunctions))}</td>
        <td class="uncovered-lines">None</td>
      </tr>
    `)
    .join("")
}

function renderWatchlistCards(records) {
  if (records.length === 0) {
    return `
      <article class="watch-card watch-card--perfect">
        <p class="watch-card__eyebrow">Connector watchlist</p>
        <h3>No watchlist files were found in the current coverage run.</h3>
      </article>
    `
  }

  return records
    .sort(compareByCoverage)
    .map((record) => {
      const tone = getCoverageTone(record)
      const linePercent = Number(formatPercent(record.coveredLines, record.totalLines))
      const functionPercent = Number(formatPercent(record.coveredFunctions, record.totalFunctions))

      return `
        <article class="watch-card watch-card--${escapeHtml(tone)}">
          <div class="watch-card__header">
            <p class="watch-card__eyebrow">Watchlist</p>
            <span class="watch-chip watch-chip--${escapeHtml(tone)}">${escapeHtml(record.area)}</span>
          </div>
          <h3>${escapeHtml(record.filePath)}</h3>
          <div class="watch-bars">
            <div>
              <div class="watch-bars__meta">
                <span>Lines</span>
                <strong>${escapeHtml(linePercent.toFixed(2))}%</strong>
              </div>
              <div class="progress-shell">
                <div class="progress-fill progress-fill--${escapeHtml(tone)}" style="width: ${escapeHtml(linePercent.toFixed(2))}%"></div>
              </div>
              <p class="watch-count">${escapeHtml(formatCount(record.coveredLines, record.totalLines))}</p>
            </div>
            <div>
              <div class="watch-bars__meta">
                <span>Functions</span>
                <strong>${escapeHtml(functionPercent.toFixed(2))}%</strong>
              </div>
              <div class="progress-shell">
                <div class="progress-fill progress-fill--${escapeHtml(tone)}" style="width: ${escapeHtml(functionPercent.toFixed(2))}%"></div>
              </div>
              <p class="watch-count">${escapeHtml(formatCount(record.coveredFunctions, record.totalFunctions))}</p>
            </div>
          </div>
          <p class="watch-uncovered">
            <span>Uncovered lines</span>
            <code>${escapeHtml(compressLineNumbers(record.uncoveredLines))}</code>
          </p>
        </article>
      `
    })
    .join("")
}

function renderAreaRows(areaSummaries) {
  return areaSummaries
    .map((summary) => `
      <tr>
        <td>${escapeHtml(summary.area)}</td>
        <td>${escapeHtml(formatPercent(summary.coveredLines, summary.totalLines))}%</td>
        <td>${escapeHtml(formatCount(summary.coveredLines, summary.totalLines))}</td>
        <td>${escapeHtml(formatPercent(summary.coveredFunctions, summary.totalFunctions))}%</td>
        <td>${escapeHtml(formatCount(summary.coveredFunctions, summary.totalFunctions))}</td>
      </tr>
    `)
    .join("")
}

function renderLedgerRows(records) {
  return records
    .map((record) => {
      const tone = getCoverageTone(record)

      return `
        <tr>
          <td class="file-path">${escapeHtml(record.filePath)}</td>
          <td>${record.audited ? "Gate" : record.watchlist ? "Watchlist" : "Observed"}</td>
          <td>${escapeHtml(record.area)}</td>
          <td class="cell--${escapeHtml(tone)}">${escapeHtml(formatPercent(record.coveredLines, record.totalLines))}%</td>
          <td>${escapeHtml(formatCount(record.coveredLines, record.totalLines))}</td>
          <td class="cell--${escapeHtml(tone)}">${escapeHtml(formatPercent(record.coveredFunctions, record.totalFunctions))}%</td>
          <td>${escapeHtml(formatCount(record.coveredFunctions, record.totalFunctions))}</td>
          <td class="uncovered-lines">${escapeHtml(compressLineNumbers(record.uncoveredLines))}</td>
        </tr>
      `
    })
    .join("")
}

function renderMissingFileList(filePaths) {
  if (filePaths.length === 0) {
    return ""
  }

  return `
    <div class="missing-panel">
      <p class="missing-panel__title">Watchlist files missing from this run</p>
      <ul>
        ${filePaths.map((filePath) => `<li><code>${escapeHtml(filePath)}</code></li>`).join("")}
      </ul>
    </div>
  `
}

function renderHtml(summary) {
  const missingWatchlistFiles = CONNECTOR_WATCHLIST_FILES.filter(
    (filePath) => !summary.watchlistRecords.some((record) => record.filePath === filePath),
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
        --background: #071019;
        --background-alt: #0c1521;
        --surface: #101a27;
        --surface-alt: #142030;
        --surface-soft: #1a2637;
        --border: rgba(147, 168, 195, 0.18);
        --text: #edf4ff;
        --muted: #91a4bc;
        --primary: #57c2c7;
        --primary-strong: #8ce1df;
        --success: #34d399;
        --warning: #f7c873;
        --danger: #fb7f6c;
        --radius-lg: 14px;
        --radius-md: 12px;
        --radius-sm: 10px;
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(87, 194, 199, 0.14), transparent 32%),
          radial-gradient(circle at top right, rgba(52, 211, 153, 0.08), transparent 28%),
          linear-gradient(180deg, var(--background), var(--background-alt));
      }

      main {
        width: min(1220px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 64px;
      }

      .hero,
      .panel,
      .metric,
      .watch-card,
      .missing-panel,
      details {
        border: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(20, 32, 48, 0.94), rgba(15, 24, 36, 0.98));
      }

      .hero,
      .panel,
      .missing-panel {
        border-radius: var(--radius-lg);
      }

      .hero {
        padding: 22px;
      }

      .hero__top,
      .watch-card__header,
      .watch-bars__meta,
      .status-strip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }

      .brand__copy {
        display: grid;
        gap: 2px;
      }

      .brand__title {
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .brand__subtitle {
        color: var(--muted);
        font-size: 0.9rem;
      }

      .brand img {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid rgba(147, 168, 195, 0.14);
        background: var(--surface-soft);
      }

      .badge-row,
      .chip-list {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .badge,
      .chip,
      .watch-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border: 1px solid rgba(147, 168, 195, 0.14);
      }

      .badge--preview,
      .chip {
        color: var(--primary-strong);
        background: rgba(87, 194, 199, 0.1);
      }

      .badge--gate {
        color: var(--success);
        background: rgba(52, 211, 153, 0.1);
      }

      .badge--watch {
        color: var(--warning);
        background: rgba(247, 200, 115, 0.1);
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      .hero__headline,
      .section-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.8fr);
        margin-top: 18px;
      }

      .eyebrow,
      .panel__eyebrow,
      .hero-aside__label,
      .missing-panel__title,
      th,
      .watch-card__eyebrow {
        color: var(--primary);
        font-size: 0.73rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .hero h1 {
        margin-top: 10px;
        font-size: clamp(1.85rem, 3vw, 2.65rem);
        line-height: 1.04;
        letter-spacing: -0.03em;
      }

      .lede,
      .panel__copy,
      .hero-aside__body,
      .watch-count,
      .watch-uncovered,
      .split-note,
      .summary-note {
        color: var(--muted);
        line-height: 1.6;
      }

      .lede {
        margin-top: 14px;
        max-width: 48rem;
      }

      .hero-aside {
        padding: 18px;
        border-radius: var(--radius-md);
        background: rgba(12, 21, 33, 0.82);
        border: 1px solid rgba(147, 168, 195, 0.14);
      }

      .hero-aside__body {
        margin-top: 10px;
      }

      .hero-aside code,
      .watch-uncovered code,
      .file-path,
      .uncovered-lines,
      code {
        font-family: "Geist Mono", ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      }

      .metrics {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-top: 18px;
      }

      .metric,
      .watch-card {
        border-radius: var(--radius-md);
        padding: 16px;
      }

      .metric--default {
        background: rgba(20, 32, 48, 0.9);
      }

      .metric--gate,
      .watch-card--perfect {
        background: linear-gradient(180deg, rgba(52, 211, 153, 0.08), rgba(20, 32, 48, 0.96));
      }

      .metric--watch,
      .watch-card--watch {
        background: linear-gradient(180deg, rgba(247, 200, 115, 0.08), rgba(20, 32, 48, 0.96));
      }

      .watch-card--strong {
        background: linear-gradient(180deg, rgba(87, 194, 199, 0.08), rgba(20, 32, 48, 0.96));
      }

      .watch-card--risk {
        background: linear-gradient(180deg, rgba(251, 127, 108, 0.08), rgba(20, 32, 48, 0.96));
      }

      .metric__label,
      .metric__count,
      .metric__caption {
        display: block;
      }

      .metric__label {
        color: var(--muted);
        font-size: 0.83rem;
        font-weight: 700;
      }

      .metric__percent {
        display: block;
        margin-top: 14px;
        font-size: 1.9rem;
        line-height: 1;
        letter-spacing: -0.04em;
      }

      .metric__count {
        margin-top: 8px;
        font-size: 0.9rem;
        color: var(--primary-strong);
        font-weight: 700;
      }

      .metric__caption {
        margin-top: 8px;
        font-size: 0.85rem;
      }

      .panel {
        padding: 20px;
        margin-top: 18px;
      }

      .panel h2 {
        margin-top: 10px;
        font-size: clamp(1.35rem, 2vw, 1.8rem);
        line-height: 1.1;
        letter-spacing: -0.03em;
      }

      .panel__copy {
        margin-top: 12px;
      }

      .summary-note {
        margin-top: 16px;
        padding: 14px;
        border: 1px solid rgba(147, 168, 195, 0.14);
        border-radius: var(--radius-sm);
        background: rgba(12, 21, 33, 0.78);
      }

      .watch-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 16px;
      }

      .watch-card h3 {
        margin-top: 12px;
        font-size: 0.98rem;
        line-height: 1.45;
        word-break: break-word;
      }

      .watch-bars {
        display: grid;
        gap: 14px;
        margin-top: 14px;
      }

      .progress-shell {
        width: 100%;
        height: 8px;
        margin-top: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: 999px;
      }

      .progress-fill--perfect {
        background: var(--success);
      }

      .progress-fill--strong {
        background: var(--primary);
      }

      .progress-fill--watch {
        background: var(--warning);
      }

      .progress-fill--risk {
        background: var(--danger);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }

      th,
      td {
        padding: 12px 0;
        border-top: 1px solid rgba(147, 168, 195, 0.12);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
      }

      td {
        padding-right: 14px;
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .file-path,
      .uncovered-lines {
        font-size: 0.82rem;
      }

      .split-note {
        margin-top: 14px;
        padding: 14px;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(87, 194, 199, 0.14);
        background: rgba(87, 194, 199, 0.06);
      }

      .cell--perfect,
      .cell--good {
        color: var(--success);
      }

      .cell--strong {
        color: var(--primary-strong);
      }

      .cell--watch {
        color: var(--warning);
      }

      .cell--risk {
        color: var(--danger);
      }

      .missing-panel { margin-top: 18px; padding: 18px; }
      .missing-panel ul { margin: 12px 0 0; padding-left: 18px; }
      .missing-panel li + li { margin-top: 8px; }

      details {
        margin-top: 18px;
        border-radius: var(--radius-md);
        overflow: hidden;
      }

      summary {
        cursor: pointer;
        list-style: none;
        padding: 16px 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      summary::-webkit-details-marker { display: none; }
      .details-body { padding: 0 18px 18px; }

      @media (max-width: 1080px) {
        .metrics,
        .hero__headline,
        .section-grid,
        .watch-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        main {
          width: min(100vw - 20px, 1220px);
          padding-top: 16px;
          padding-bottom: 40px;
        }

        .hero,
        .panel {
          padding: 16px;
        }

        th,
        td {
          padding: 10px 0;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero__top">
          <div class="brand">
            <img src="/logo.png" alt="CodStats logo" />
            <div class="brand__copy">
              <span class="brand__title">CodStats Coverage</span>
              <span class="brand__subtitle">Preview contract coverage for the ChatGPT connector and backend edge.</span>
            </div>
          </div>
          <div class="badge-row">
            <span class="badge badge--preview">Preview only</span>
            <span class="badge badge--gate">Hard gate = 100%</span>
            <span class="badge badge--watch">Watchlist stays visible</span>
          </div>
        </div>

        <div class="hero__headline">
          <div>
            <p class="eyebrow">Coverage</p>
            <h1>Only the required contract surface must stay perfect.</h1>
            <p class="lede">
              This page is split on purpose. The required section is the merge-blocking public
              connector contract and protocol core, and every file there must stay at 100% for
              lines and functions. The watchlist section is still important, but it is visible
              follow-up work rather than a failed gate.
            </p>
            <div class="summary-note">
              <strong>Reading rule:</strong> if a file is not listed in the required table, its
              percentage is not part of the 100% gate. It is still shown so weak areas are obvious
              instead of disappearing into one blended total.
            </div>
          </div>
          <aside class="hero-aside">
            <p class="hero-aside__label">Generated</p>
            <p class="hero-aside__body">${escapeHtml(formatTimestamp(summary.generatedAt))}</p>
            <p class="hero-aside__body">
              Hard gate files: <code>${escapeHtml(String(summary.auditedRecords.length))}</code><br />
              Watchlist files: <code>${escapeHtml(String(summary.watchlistRecords.length))}</code>
            </p>
          </aside>
        </div>

        <div class="metrics">
          ${renderMetricCard("Audited lines", summary.auditedTotals.coveredLines, summary.auditedTotals.totalLines, "The merge-blocking public contract layer must stay perfect.", "gate")}
          ${renderMetricCard("Audited functions", summary.auditedTotals.coveredFunctions, summary.auditedTotals.totalFunctions, "Function coverage for the same hard-gated audited files.", "gate")}
          ${renderMetricCard("Watchlist lines", summary.watchlistTotals.coveredLines, summary.watchlistTotals.totalLines, "Important connector files that are tracked closely but not merge-blocking yet.", "watch")}
          ${renderMetricCard("Full suite lines", summary.totals.coveredLines, summary.totals.totalLines, "Everything Bun exercised in this preview run across web and backend code.", "default")}
        </div>
      </section>

      <section class="section-grid">
        <section class="panel">
          <p class="panel__eyebrow">Required contract surface</p>
          <h2>These files are the 100% requirement.</h2>
          <p class="panel__copy">
            The required bucket now covers the public connector negotiation edge: discovery metadata,
            the authorize route, the MCP transport route, widget template routes, and the backend helpers
            that define auth and widget metadata. This is the surface that is safe to treat as merge-blocking.
          </p>
          <div class="chip-list">
            <span class="chip">${escapeHtml(String(summary.auditedRecords.length))} audited files</span>
            <span class="chip">${escapeHtml(formatCount(summary.auditedTotals.coveredLines, summary.auditedTotals.totalLines))} audited lines</span>
            <span class="chip">${escapeHtml(formatCount(summary.auditedTotals.coveredFunctions, summary.auditedTotals.totalFunctions))} audited functions</span>
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
            <tbody>${renderAuditedRows(summary.auditedRecords)}</tbody>
          </table>
        </section>

        <section class="panel">
          <p class="panel__eyebrow">Reading the split</p>
          <h2>Watchlist files still matter.</h2>
          <p class="panel__copy">
            The watchlist exists so incomplete coverage does not hide behind the all-files average. It is the
            queue for the next promotion into the required bucket. Until a file graduates, weak coverage stays
            visible and actionable, but it is not mislabeled as a failed 100% rule.
          </p>
          <div class="split-note">
            <strong>Current steering:</strong> the public discovery, authorize, widget metadata, and transport edge
            are already required. Stateful revoke flows, deeper backend connector orchestration, Redis wiring, and
            app API routes stay in the watchlist until their branch coverage is strong enough to make blocking.
          </div>
          ${renderMissingFileList(missingWatchlistFiles)}
        </section>
      </section>

      <section class="panel">
        <p class="panel__eyebrow">Connector watchlist</p>
        <h2>These are visible follow-up files, not hidden failures.</h2>
        <p class="panel__copy">
          Watchlist files are important connector and backend paths that still need deeper branch coverage before
          they are worth making merge-blocking. They are sorted here by lowest coverage first, with exact uncovered
          ranges so the next promotion target is obvious.
        </p>
        <div class="watch-grid">${renderWatchlistCards(summary.watchlistRecords)}</div>
      </section>

      <section class="section-grid">
        <section class="panel">
          <p class="panel__eyebrow">Area totals</p>
          <h2>Whole-suite coverage by runtime area.</h2>
          <p class="panel__copy">
            These totals help track overall health, but they are not the same thing as the required contract gate.
          </p>
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
          <p class="panel__eyebrow">Preview policy</p>
          <h2>The report is private, preview-only, and production-blocked.</h2>
          <p class="panel__copy">
            The artifact is generated into <code>/public/coverage</code> for preview deployments, rewritten from
            <code>/coverage</code>, and blocked outside preview by the proxy layer. It is meant to explain gate
            health quickly, not to publish raw source listings.
          </p>
          <div class="chip-list">
            <span class="chip">Preview artifact only</span>
            <span class="chip">No source listings</span>
            <span class="chip">Uncovered ranges only</span>
          </div>
        </section>
      </section>

      <details>
        <summary>Open full observed ledger</summary>
        <div class="details-body">
          <p class="panel__copy">
            This ledger includes every collected web and backend source file from the Bun coverage run.
            It is sorted by line coverage ascending and is useful for queueing the next promotion into the required gate.
          </p>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Bucket</th>
                <th>Area</th>
                <th>Lines</th>
                <th>Covered lines</th>
                <th>Functions</th>
                <th>Covered functions</th>
                <th>Uncovered lines</th>
              </tr>
            </thead>
            <tbody>${renderLedgerRows(summary.records)}</tbody>
          </table>
        </div>
      </details>
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
