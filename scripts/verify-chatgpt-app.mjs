import process from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const WIDGET_PATH = "/ui/codstats/widget.html";
const WIDGET_TEMPLATE_TOOLS = [
  "codstats_open",
  "codstats_get_current_session",
  "codstats_get_last_session",
  "codstats_get_match_history",
  "codstats_get_rank_progress",
  "codstats_get_settings",
];

function parseArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }

  return process.argv[index + 1];
}

function parseBaseUrl() {
  const value = parseArgValue("--base-url", "http://localhost:3000");

  try {
    return new URL(value);
  } catch {
    throw new Error(`Invalid --base-url value: ${value}`);
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isHtmlContentType(contentType) {
  return contentType.toLowerCase().includes("text/html");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  assertCondition(response.status === 200, `${url.pathname} returned status ${response.status}`);
  assertCondition(
    contentType.toLowerCase().includes("application/json"),
    `${url.pathname} did not return application/json (content-type: ${contentType || "(missing)"})`,
  );
  assertCondition(
    !isHtmlContentType(contentType),
    `${url.pathname} returned HTML content-type`,
  );

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${url.pathname} returned invalid JSON`);
  }

  return payload;
}

async function verifyAuthorizationServerMetadata(baseUrl) {
  const url = new URL("/.well-known/oauth-authorization-server", baseUrl);
  const payload = await fetchJson(url);

  assertCondition(
    typeof payload.issuer === "string" && payload.issuer.length > 0,
    "authorization metadata missing issuer",
  );
  assertCondition(
    typeof payload.authorization_endpoint === "string",
    "authorization metadata missing authorization_endpoint",
  );
  assertCondition(
    typeof payload.token_endpoint === "string",
    "authorization metadata missing token_endpoint",
  );
  assertCondition(
    typeof payload.registration_endpoint === "string",
    "authorization metadata missing registration_endpoint",
  );

  return payload;
}

async function verifyProtectedResourceMetadata(baseUrl, expectedIssuer) {
  const url = new URL("/.well-known/oauth-protected-resource", baseUrl);
  const payload = await fetchJson(url);

  assertCondition(
    Array.isArray(payload.authorization_servers),
    "protected resource metadata missing authorization_servers",
  );

  if (expectedIssuer) {
    assertCondition(
      payload.authorization_servers.includes(expectedIssuer),
      `protected resource metadata does not include issuer ${expectedIssuer}`,
    );
  }

  return payload;
}

async function verifyMcpEndpointIsNotHtml(baseUrl) {
  const url = new URL("/mcp", baseUrl);
  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  assertCondition(response.status !== 404, "/mcp returned 404");
  assertCondition(response.status < 500, `/mcp returned ${response.status}`);
  assertCondition(!isHtmlContentType(contentType), "/mcp returned HTML login content");

  return {
    status: response.status,
    contentType,
  };
}

async function verifyWidgetHtmlEndpoint(baseUrl) {
  const url = new URL(WIDGET_PATH, baseUrl);

  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const csp = response.headers.get("content-security-policy") ?? "";

  assertCondition(response.status === 200, `${url.pathname} returned status ${response.status}`);
  assertCondition(
    contentType.toLowerCase().includes("text/html"),
    `${url.pathname} did not return text/html (content-type: ${contentType || "(missing)"})`,
  );
  assertCondition(csp.length > 0, `${url.pathname} is missing Content-Security-Policy`);

  return {
    csp,
  };
}

async function verifyToolTemplateMetadata(baseUrl) {
  const mcpUrl = new URL("/mcp", baseUrl);
  const expectedWidgetUrl = new URL(WIDGET_PATH, baseUrl).toString();

  const client = new Client({
    name: "codstats-preflight-client",
    version: "1.0.0",
  });
  const transport = new StreamableHTTPClientTransport(mcpUrl);

  await client.connect(transport);

  try {
    const listedTools = await client.listTools();

    for (const toolName of WIDGET_TEMPLATE_TOOLS) {
      const tool = listedTools.tools.find((candidate) => candidate.name === toolName);

      assertCondition(tool, `MCP tools list does not include ${toolName}`);
      assertCondition(
        tool._meta?.ui?.resourceUri === expectedWidgetUrl,
        `${toolName} _meta.ui.resourceUri must equal ${expectedWidgetUrl}`,
      );
      assertCondition(
        tool._meta?.["openai/outputTemplate"] === expectedWidgetUrl,
        `${toolName} _meta["openai/outputTemplate"] must equal ${expectedWidgetUrl}`,
      );
    }

    return {
      resourceUri: expectedWidgetUrl,
    };
  } finally {
    await Promise.allSettled([client.close(), transport.close()]);
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function runCheck(name, checkFn, failures) {
  try {
    const detail = await checkFn();
    console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
    return;
  } catch (error) {
    const message = formatError(error);
    failures.push({ name, message });
    console.error(`FAIL ${name} - ${message}`);
  }
}

async function main() {
  const baseUrl = parseBaseUrl();
  const failures = [];
  let authorizationMetadata = null;

  console.log(`[verify] Base URL: ${baseUrl.toString()}`);

  await runCheck(
    "OAuth authorization metadata",
    async () => {
      authorizationMetadata = await verifyAuthorizationServerMetadata(baseUrl);
      return `issuer=${authorizationMetadata.issuer}`;
    },
    failures,
  );

  await runCheck(
    "OAuth protected resource metadata",
    async () => {
      const payload = await verifyProtectedResourceMetadata(
        baseUrl,
        authorizationMetadata?.issuer,
      );
      return `resource=${payload.resource}`;
    },
    failures,
  );

  await runCheck(
    "MCP endpoint content type",
    async () => {
      const result = await verifyMcpEndpointIsNotHtml(baseUrl);
      return `status=${result.status} content-type=${result.contentType || "(missing)"}`;
    },
    failures,
  );

  await runCheck(
    "Widget HTML endpoint",
    async () => {
      const result = await verifyWidgetHtmlEndpoint(baseUrl);
      return `csp=${result.csp}`;
    },
    failures,
  );

  await runCheck(
    "Tool output templates",
    async () => {
      const result = await verifyToolTemplateMetadata(baseUrl);
      return `resourceUri=${result.resourceUri}`;
    },
    failures,
  );

  if (failures.length > 0) {
    console.error(`\n[verify] FAILED (${failures.length} check${failures.length === 1 ? "" : "s"})`);
    process.exitCode = 1;
    return;
  }

  console.log("\n[verify] ALL CHECKS PASSED");
}

main().catch((error) => {
  console.error(`[verify] FAILED: ${formatError(error)}`);
  process.exitCode = 1;
});
