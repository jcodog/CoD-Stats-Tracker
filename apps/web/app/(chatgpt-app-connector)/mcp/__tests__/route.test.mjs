import { afterEach, describe, expect, it } from "bun:test";
import {
  OPTIONS,
  handleMcpRequest,
} from "../route.ts";

const TEST_ORIGIN = "https://codstats.test";

let transportInstances = [];
let serverInstances = [];
let handleRequestImpl = async () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Mcp-Session-Id": "session_test_123",
    },
  });

function resetMocks() {
  transportInstances = [];
  serverInstances = [];
  handleRequestImpl = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Mcp-Session-Id": "session_test_123",
      },
    });
}

class FakeTransport {
  constructor(options) {
    this.options = options;
    this.requests = [];
    this.closeCalls = 0;
    transportInstances.push(this);
  }

  async handleRequest(request) {
    this.requests.push(request);
    return handleRequestImpl(request, this);
  }

  async close() {
    this.closeCalls += 1;
  }
}

function createRouteDeps() {
  return {
    createRequestId: () => "req_test_123",
    createServer: ({ requestOrigin } = {}) => {
      const server = {
        requestOrigin,
        connectCalls: 0,
        closeCalls: 0,
        lastTransport: null,
        async connect(transport) {
          this.connectCalls += 1;
          this.lastTransport = transport;
        },
        async close() {
          this.closeCalls += 1;
        },
      };

      serverInstances.push(server);
      return server;
    },
    createTransport: FakeTransport,
  };
}

afterEach(() => {
  resetMocks();
});

describe("/mcp route transport handling", () => {
  it("returns CORS preflight headers for OPTIONS", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("normalizes POST Accept headers for json-only requests and closes non-stream transports", async () => {
    const response = await handleMcpRequest(
      new Request(`${TEST_ORIGIN}/mcp`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      }),
      createRouteDeps(),
    );

    const transport = transportInstances[0];
    const server = serverInstances[0];

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(transport.options.enableJsonResponse).toBe(true);
    expect(transport.requests[0].headers.get("accept")).toContain("application/json");
    expect(transport.requests[0].headers.get("accept")).toContain("text/event-stream");
    expect(server.requestOrigin).toBe(TEST_ORIGIN);
    expect(server.connectCalls).toBe(1);
    expect(transport.closeCalls).toBe(1);
    expect(server.closeCalls).toBe(1);
  });

  it("keeps event-stream requests open and does not force json responses", async () => {
    handleRequestImpl = async () =>
      new Response("data: ok\n\n", {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      });

    const response = await handleMcpRequest(
      new Request(`${TEST_ORIGIN}/mcp`, {
        headers: {
          Accept: "text/event-stream",
        },
      }),
      createRouteDeps(),
    );

    const transport = transportInstances[0];
    const server = serverInstances[0];

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("access-control-expose-headers")).toBe("Mcp-Session-Id");
    expect(transport.options.enableJsonResponse).toBe(false);
    expect(transport.requests[0].headers.get("accept")).toBe("text/event-stream");
    expect(transport.closeCalls).toBe(0);
    expect(server.closeCalls).toBe(0);
  });

  it("returns an internal json-rpc error with a request id when transport handling fails", async () => {
    handleRequestImpl = async () => {
      throw new Error("transport exploded");
    };

    const response = await handleMcpRequest(
      new Request(`${TEST_ORIGIN}/mcp`, {
        method: "DELETE",
      }),
      createRouteDeps(),
    );
    const body = await response.json();

    const transport = transportInstances[0];
    const server = serverInstances[0];

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-request-id")).toBe("req_test_123");
    expect(body).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
      },
      id: null,
    });
    expect(transport.closeCalls).toBe(1);
    expect(server.closeCalls).toBe(1);
  });
});
