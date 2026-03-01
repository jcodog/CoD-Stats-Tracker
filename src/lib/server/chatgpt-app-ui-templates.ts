import {
  getAppPublicOrigin,
  getCodstatsTemplateResourceUri,
  getCodstatsTemplateUrl,
  type CodstatsTemplateName,
} from "@/lib/server/app-public-origin";

type CodstatsTemplateRecord = {
  title: string;
  description: string;
};

type RequestOriginInput = Request | URL | string | null | undefined;

const CODSTATS_TEMPLATES: Record<CodstatsTemplateName, CodstatsTemplateRecord> = {
  widget: {
    title: "CodStats Command Center",
    description: "CodStats launch panel for quick access to sessions, matches, rank, and settings.",
  },
  session: {
    title: "CodStats Session",
    description: "Live or recent ranked session view with SR, KD, and compact highlights.",
  },
  matches: {
    title: "CodStats Match History",
    description: "Paginated ranked match feed with SR deltas and performance chips.",
  },
  rank: {
    title: "CodStats Rank Progress",
    description: "Rank progress board with ladder ranges and SR targets to climb.",
  },
  settings: {
    title: "CodStats Settings",
    description: "Connection status panel for linked account details and disconnect actions.",
  },
};

const CODSTATS_TEMPLATE_CSP_HEADER = [
  "default-src 'none'",
  "frame-ancestors https://chatgpt.com https://chat.openai.com",
  "connect-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self'",
  "script-src 'self'",
  "media-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function getCodstatsAssetUrl(assetPath: string, requestOriginInput?: RequestOriginInput) {
  return `${getAppPublicOrigin(requestOriginInput)}${assetPath}`;
}

function renderTemplateBody(templateName: CodstatsTemplateName) {
  switch (templateName) {
    case "session":
      return `
    <main class="codstats-shell" data-template="session">
      <header class="codstats-header">
        <div>
          <p class="codstats-eyebrow">Ranked Session</p>
          <h1 class="codstats-title" id="session-title">Session Overview</h1>
          <p class="codstats-subtitle" id="session-subtitle">Track your current run with live SR and combat stats.</p>
        </div>
        <span class="codstats-pill" id="session-status-pill">Inactive</span>
      </header>

      <section class="codstats-card">
        <div class="codstats-stat-grid codstats-stat-grid-primary">
          <article class="codstats-stat">
            <span class="codstats-stat-label">SR Current</span>
            <strong class="codstats-stat-value" id="session-sr-current">--</strong>
          </article>
          <article class="codstats-stat">
            <span class="codstats-stat-label">SR Delta</span>
            <strong class="codstats-stat-value" id="session-sr-delta">--</strong>
          </article>
          <article class="codstats-stat">
            <span class="codstats-stat-label">W L</span>
            <strong class="codstats-stat-value" id="session-wl">--</strong>
          </article>
          <article class="codstats-stat">
            <span class="codstats-stat-label">KD</span>
            <strong class="codstats-stat-value" id="session-kd">--</strong>
          </article>
        </div>
      </section>

      <section class="codstats-card">
        <div class="codstats-stat-grid codstats-stat-grid-secondary">
          <article class="codstats-stat">
            <span class="codstats-stat-label">Kills Deaths</span>
            <strong class="codstats-stat-value" id="session-kd-count">--</strong>
          </article>
          <article class="codstats-stat">
            <span class="codstats-stat-label">Best Streak</span>
            <strong class="codstats-stat-value" id="session-best-streak">--</strong>
          </article>
          <article class="codstats-stat">
            <span class="codstats-stat-label">Start Time</span>
            <strong class="codstats-stat-value codstats-stat-value-small" id="session-start-time">--</strong>
          </article>
          <article class="codstats-stat">
            <span class="codstats-stat-label">Last Updated</span>
            <strong class="codstats-stat-value codstats-stat-value-small" id="session-last-updated">--</strong>
          </article>
        </div>
      </section>

      <section class="codstats-card">
        <div class="codstats-card-head">
          <h2 class="codstats-card-title">Highlights</h2>
          <p class="codstats-card-subtitle">Top recent match SR swings in this session.</p>
        </div>
        <ol class="codstats-highlight-list" id="session-highlights"></ol>
        <p class="codstats-empty-text" id="session-highlights-empty">No recent match deltas available.</p>
      </section>

      <section class="codstats-card codstats-empty is-hidden" id="session-empty-state">
        <h2 class="codstats-card-title">No active session</h2>
        <p class="codstats-card-subtitle" id="session-empty-copy">Start a ranked run to fill this panel with live stats.</p>
        <div class="codstats-actions">
          <button type="button" class="codstats-btn codstats-btn-secondary" data-tool="codstats_get_match_history" data-tool-args='{"limit":15}'>Open Matches</button>
          <button type="button" class="codstats-btn" data-tool="codstats_get_last_session">Load Last Session</button>
        </div>
      </section>
    </main>`;
    case "matches":
      return `
    <main class="codstats-shell" data-template="matches">
      <header class="codstats-header">
        <div>
          <p class="codstats-eyebrow">Match Feed</p>
          <h1 class="codstats-title">Recent Matches</h1>
          <p class="codstats-subtitle">Compact ranked cards with SR movement and combat output.</p>
        </div>
        <span class="codstats-pill codstats-pill-accent" id="matches-count-pill">0 loaded</span>
      </header>

      <section class="codstats-match-list" id="matches-list"></section>

      <template id="codstats-match-template">
        <article class="codstats-card codstats-match-card">
          <div class="codstats-match-top">
            <div>
              <p class="codstats-match-mode" data-field="mode">Mode</p>
              <p class="codstats-match-map" data-field="map">Map</p>
            </div>
            <span class="codstats-result-pill" data-field="result">Result</span>
          </div>
          <div class="codstats-chip-row">
            <span class="codstats-chip"><span>SR</span><strong data-field="srDelta">--</strong></span>
            <span class="codstats-chip"><span>K D</span><strong data-field="kdCount">--</strong></span>
            <span class="codstats-chip"><span>KD</span><strong data-field="kd">--</strong></span>
            <span class="codstats-chip"><span>Time</span><strong data-field="playedAt">--</strong></span>
          </div>
        </article>
      </template>

      <footer class="codstats-card codstats-footer">
        <p class="codstats-footer-status" id="matches-next-status">No next page available.</p>
        <p class="codstats-note" id="matches-next-hint">Use codstats_get_match_history to request the next page.</p>
        <button type="button" class="codstats-btn codstats-btn-secondary is-hidden" id="matches-next-button">Load Next Page</button>
      </footer>
    </main>`;
    case "rank":
      return `
    <main class="codstats-shell" data-template="rank">
      <header class="codstats-header">
        <div>
          <p class="codstats-eyebrow">Ladder Progress</p>
          <h1 class="codstats-title" id="rank-title">Rank Progress</h1>
          <p class="codstats-subtitle" id="rank-ruleset">Live ladder state from the configured SR ruleset.</p>
        </div>
        <span class="codstats-pill codstats-pill-accent" id="rank-current-tier">Unranked</span>
      </header>

      <section class="codstats-grid codstats-grid-two">
        <article class="codstats-card">
          <span class="codstats-stat-label">Current SR</span>
          <strong class="codstats-stat-value" id="rank-current-sr">--</strong>
        </article>
        <article class="codstats-card">
          <span class="codstats-stat-label">Current Division</span>
          <strong class="codstats-stat-value" id="rank-current-division">--</strong>
        </article>
      </section>

      <section class="codstats-card">
        <div class="codstats-card-head">
          <h2 class="codstats-card-title">Progress Targets</h2>
          <p class="codstats-card-subtitle">Exact SR requirements from ladder config only.</p>
        </div>

        <div class="codstats-progress-stack">
          <div class="codstats-progress-block">
            <div class="codstats-progress-head">
              <span>Next Division</span>
              <strong id="rank-next-division-needed">--</strong>
            </div>
            <div class="codstats-progress-track">
              <div class="codstats-progress-fill" id="rank-next-division-fill"></div>
            </div>
          </div>

          <div class="codstats-progress-block">
            <div class="codstats-progress-head">
              <span>Next Rank</span>
              <strong id="rank-next-rank-needed">--</strong>
            </div>
            <div class="codstats-progress-track">
              <div class="codstats-progress-fill" id="rank-next-rank-fill"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="codstats-grid codstats-grid-two">
        <article class="codstats-card">
          <h3 class="codstats-card-title">Current Tier Range</h3>
          <p class="codstats-note" id="rank-current-range">--</p>
        </article>
        <article class="codstats-card">
          <h3 class="codstats-card-title">Next Tier Range</h3>
          <p class="codstats-note" id="rank-next-range">--</p>
        </article>
      </section>
    </main>`;
    case "settings":
      return `
    <main class="codstats-shell" data-template="settings">
      <header class="codstats-header">
        <div>
          <p class="codstats-eyebrow">Connection</p>
          <h1 class="codstats-title">CodStats Settings</h1>
          <p class="codstats-subtitle">Manage your linked account and sync status.</p>
        </div>
        <span class="codstats-pill" id="settings-status-pill">Disconnected</span>
      </header>

      <section class="codstats-grid codstats-grid-two">
        <article class="codstats-card">
          <span class="codstats-stat-label">Connection</span>
          <strong class="codstats-stat-value" id="settings-connection-value">--</strong>
        </article>
        <article class="codstats-card">
          <span class="codstats-stat-label">Plan</span>
          <strong class="codstats-stat-value" id="settings-plan-value">--</strong>
        </article>
      </section>

      <section class="codstats-card">
        <dl class="codstats-detail-list">
          <div class="codstats-detail-row">
            <dt>Linked Discord</dt>
            <dd id="settings-discord-value">--</dd>
          </div>
          <div class="codstats-detail-row">
            <dt>Last Sync</dt>
            <dd id="settings-last-sync-value">--</dd>
          </div>
          <div class="codstats-detail-row">
            <dt>User</dt>
            <dd id="settings-user-value">--</dd>
          </div>
        </dl>
      </section>

      <section class="codstats-actions codstats-actions-wrap">
        <button type="button" class="codstats-btn" data-tool="codstats_open" data-tool-args='{"tab":"overview"}'>Open Dashboard</button>
        <button type="button" class="codstats-btn codstats-btn-danger" id="settings-disconnect-trigger">Disconnect</button>
        <button type="button" class="codstats-btn codstats-btn-danger is-hidden" id="settings-disconnect-confirm">Confirm Disconnect</button>
        <button type="button" class="codstats-btn codstats-btn-secondary is-hidden" id="settings-disconnect-cancel">Cancel</button>
      </section>

      <p class="codstats-note" id="settings-feedback">Disconnect requires confirmation.</p>
    </main>`;
    case "widget":
    default:
      return `
    <main class="codstats-shell codstats-widget-shell" data-template="widget">
      <header class="codstats-header codstats-widget-header">
        <div>
          <p class="codstats-eyebrow">CodStats Ranked</p>
          <h1 class="codstats-title codstats-widget-title">Esports Command Deck</h1>
          <p class="codstats-subtitle" id="widget-subtitle">Live ranked snapshot for your linked account.</p>
        </div>
        <div class="codstats-widget-header-controls">
          <span class="codstats-pill codstats-pill-accent" id="widget-tab-pill">Overview</span>
          <button
            type="button"
            class="codstats-btn codstats-btn-secondary"
            data-tool="codstats_open"
            data-tool-args='{"tab":"overview"}'
          >
            Refresh
          </button>
        </div>
      </header>

      <section class="codstats-widget-grid">
        <article class="codstats-card codstats-widget-card" data-widget-section="current-session">
          <div class="codstats-card-head">
            <h2 class="codstats-card-title">Current Session</h2>
            <p class="codstats-card-subtitle">Live SR performance and core combat stats.</p>
          </div>

          <dl class="codstats-widget-metric-grid">
            <div class="codstats-widget-metric">
              <dt>SR</dt>
              <dd id="widget-session-sr">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>SR Change</dt>
              <dd id="widget-session-sr-change">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>Matches</dt>
              <dd id="widget-session-matches">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>W/L</dt>
              <dd id="widget-session-wl">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>K/D</dt>
              <dd id="widget-session-kd">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>Kills</dt>
              <dd id="widget-session-kills">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>Deaths</dt>
              <dd id="widget-session-deaths">--</dd>
            </div>
            <div class="codstats-widget-metric">
              <dt>Best Streak</dt>
              <dd id="widget-session-best-streak">--</dd>
            </div>
            <div class="codstats-widget-metric codstats-widget-metric-wide">
              <dt>Started</dt>
              <dd id="widget-session-started-at">--</dd>
            </div>
          </dl>
        </article>

        <article class="codstats-card codstats-widget-card" data-widget-section="rank-progress">
          <div class="codstats-card-head">
            <h2 class="codstats-card-title">Rank Progress</h2>
            <p class="codstats-card-subtitle">Current tier and next ladder targets.</p>
          </div>

          <dl class="codstats-widget-metric-stack">
            <div class="codstats-widget-metric-row">
              <dt>Current Rank</dt>
              <dd id="widget-rank-current">--</dd>
            </div>
            <div class="codstats-widget-metric-row">
              <dt>Current SR</dt>
              <dd id="widget-rank-current-sr">--</dd>
            </div>
            <div class="codstats-widget-metric-row">
              <dt>Next Division</dt>
              <dd id="widget-rank-next-division">--</dd>
            </div>
            <div class="codstats-widget-metric-row">
              <dt>Next Rank</dt>
              <dd id="widget-rank-next-rank">--</dd>
            </div>
            <div class="codstats-widget-metric-row">
              <dt>SR Needed</dt>
              <dd id="widget-rank-sr-needed">--</dd>
            </div>
          </dl>
        </article>
      </section>

      <section class="codstats-card codstats-widget-card" data-widget-section="recent-matches">
        <div class="codstats-card-head">
          <h2 class="codstats-card-title">Recent Matches</h2>
          <p class="codstats-card-subtitle">Latest ranked results (up to five).</p>
        </div>

        <ul class="codstats-widget-match-list" id="widget-matches-list"></ul>
        <template id="codstats-widget-match-row-template">
          <li class="codstats-widget-match-row">
            <span class="codstats-widget-match-main" data-field="summary">Mode</span>
            <span class="codstats-widget-match-sr" data-field="srDelta">--</span>
            <span class="codstats-widget-match-kd" data-field="kd">--</span>
            <span class="codstats-widget-match-time" data-field="playedAt">--</span>
          </li>
        </template>
        <p class="codstats-empty-text" id="widget-matches-empty">No recent matches available.</p>
      </section>

      <section class="codstats-card codstats-widget-card" data-widget-section="connection">
        <div class="codstats-widget-connection-head">
          <div class="codstats-card-head">
            <h2 class="codstats-card-title">Connection</h2>
            <p class="codstats-card-subtitle">Account link health and actions.</p>
          </div>
          <span class="codstats-pill" id="widget-connection-status">Disconnected</span>
        </div>

        <p class="codstats-note" id="widget-actions-hint">
          Open settings to link your account. Disconnect is available after linking.
        </p>

        <div class="codstats-actions codstats-actions-wrap">
          <button
            type="button"
            class="codstats-btn codstats-btn-secondary"
            data-tool="codstats_open"
            data-tool-args='{"tab":"settings"}'
          >
            Open Settings
          </button>
          <button
            type="button"
            class="codstats-btn codstats-btn-danger"
            id="widget-disconnect-button"
            data-tool="codstats_disconnect"
            data-tool-args='{"confirm":true}'
          >
            Disconnect
          </button>
        </div>
      </section>
    </main>`;
  }
}

export function renderCodstatsTemplateHtml(
  templateName: CodstatsTemplateName,
  requestOriginInput?: RequestOriginInput,
) {
  const hostedTemplateUrl = getCodstatsTemplateUrl(templateName, requestOriginInput);
  const stylesheetUrl = getCodstatsAssetUrl("/ui/codstats/styles.css", requestOriginInput);
  const scriptUrl = getCodstatsAssetUrl("/ui/codstats/app.js", requestOriginInput);
  const { title } = CODSTATS_TEMPLATES[templateName];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${title}</title>
    <link rel="canonical" href="${hostedTemplateUrl}" />
    <link rel="stylesheet" href="${stylesheetUrl}" />
    <script src="${scriptUrl}" defer></script>
  </head>
  <body>
    ${renderTemplateBody(templateName)}
  </body>
</html>`;
}

export function getCodstatsTemplateCspHeader() {
  return CODSTATS_TEMPLATE_CSP_HEADER;
}

export function getCodstatsTemplateCatalog(requestOriginInput?: RequestOriginInput) {
  return (Object.keys(CODSTATS_TEMPLATES) as CodstatsTemplateName[]).map(
    (templateName) => ({
      name: templateName,
      title: CODSTATS_TEMPLATES[templateName].title,
      description: CODSTATS_TEMPLATES[templateName].description,
      resourceUri: getCodstatsTemplateResourceUri(templateName),
      hostedUrl: getCodstatsTemplateUrl(templateName, requestOriginInput),
    }),
  );
}

export function getCodstatsTemplateResourceMeta(requestOriginInput?: RequestOriginInput) {
  const templateOrigin = new URL(getCodstatsTemplateUrl("widget", requestOriginInput)).origin;

  return {
    ui: {
      prefersBorder: true,
      domain: templateOrigin,
      csp: {
        connectDomains: [templateOrigin],
        resourceDomains: [templateOrigin],
        frameDomains: [],
        baseUriDomains: [templateOrigin],
      },
    },
    "openai/widgetDescription":
      "CodStats esports dashboard for ranked sessions, match history, rank progress, and settings.",
    "openai/widgetPrefersBorder": true,
    "openai/widgetDomain": templateOrigin,
    "openai/widgetCSP": {
      connect_domains: [templateOrigin],
      resource_domains: [templateOrigin],
      frame_domains: [],
      redirect_domains: [templateOrigin],
    },
  };
}

export function createCodstatsTemplateHtmlResponse(
  templateName: CodstatsTemplateName,
  requestOriginInput?: RequestOriginInput,
) {
  return new Response(renderCodstatsTemplateHtml(templateName, requestOriginInput), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": getCodstatsTemplateCspHeader(),
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
