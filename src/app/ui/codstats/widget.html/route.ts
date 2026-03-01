export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDGET_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodStats Widget</title>
  </head>
  <body>
    <main>
      <h1>CodStats</h1>
      <p>This widget template is served from the CodStats app origin.</p>
      <p>Use CodStats tools in ChatGPT to load current data into this view.</p>
    </main>
  </body>
</html>`;

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "frame-ancestors https://chatgpt.com https://chat.openai.com",
  "connect-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self'",
  "script-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export async function GET() {
  return new Response(WIDGET_HTML, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CONTENT_SECURITY_POLICY,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
