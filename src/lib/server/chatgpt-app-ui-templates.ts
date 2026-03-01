import {
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
    title: "CodStats Dashboard",
    description:
      "Compact CodStats dashboard with quick navigation across sessions, matches, rank, and settings.",
  },
  session: {
    title: "CodStats Session",
    description: "Compact session card for the latest active or recent session details.",
  },
  settings: {
    title: "CodStats Settings",
    description: "CodStats connection status and account management actions.",
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

function renderTemplateBody(templateName: CodstatsTemplateName) {
  switch (templateName) {
    case "session":
      return `
    <main>
      <h1>Current Session</h1>
      <p>Live session details appear here when a session is active.</p>
      <section>
        <h2>At a glance</h2>
        <ul>
          <li>Wins, losses, and SR change</li>
          <li>Current KD and recent match timestamp</li>
          <li>Session start and current rank position</li>
        </ul>
      </section>
    </main>`;
    case "settings":
      return `
    <main>
      <h1>Connection Settings</h1>
      <p>Manage your CodStats connection and scope permissions from ChatGPT.</p>
      <section>
        <h2>Connection</h2>
        <ul>
          <li>Link status and account plan</li>
          <li>Required scopes: profile.read and stats.read</li>
          <li>Disconnect controls are available in-tool</li>
        </ul>
      </section>
    </main>`;
    case "widget":
    default:
      return `
    <main>
      <h1>CodStats Dashboard</h1>
      <p>Use CodStats tools in ChatGPT to refresh sessions, matches, and rank insights.</p>
      <section>
        <h2>Quick tabs</h2>
        <ul>
          <li>Overview</li>
          <li>Matches</li>
          <li>Rank</li>
          <li>Settings</li>
        </ul>
      </section>
    </main>`;
  }
}

export function renderCodstatsTemplateHtml(
  templateName: CodstatsTemplateName,
  requestOriginInput?: RequestOriginInput,
) {
  const hostedTemplateUrl = getCodstatsTemplateUrl(templateName, requestOriginInput);
  const { title } = CODSTATS_TEMPLATES[templateName];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="canonical" href="${hostedTemplateUrl}" />
  </head>
  <body>${renderTemplateBody(templateName)}
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
      "CodStats compact widget for sessions, rank progress, and account settings.",
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
