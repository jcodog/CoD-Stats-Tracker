const APP_WIDGET_PATH = "/ui/codstats/widget.html";

export function getAppPublicOrigin() {
  const rawOrigin = process.env.APP_PUBLIC_ORIGIN?.trim();

  if (!rawOrigin) {
    throw new Error(
      "Missing required env var APP_PUBLIC_ORIGIN. Set it to your canonical HTTPS app origin.",
    );
  }

  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(rawOrigin);
  } catch {
    throw new Error(
      `Invalid APP_PUBLIC_ORIGIN: \"${rawOrigin}\". Use an absolute HTTPS URL like https://stats.cleoai.cloud.`,
    );
  }

  if (parsedOrigin.protocol !== "https:") {
    throw new Error(
      `APP_PUBLIC_ORIGIN must use https://. Received protocol \"${parsedOrigin.protocol}\".`,
    );
  }

  if (!parsedOrigin.hostname) {
    throw new Error(
      `Invalid APP_PUBLIC_ORIGIN: \"${rawOrigin}\". Include a hostname, for example https://stats.cleoai.cloud.`,
    );
  }

  return parsedOrigin.origin;
}

export function getCodstatsWidgetTemplateUrl() {
  return `${getAppPublicOrigin()}${APP_WIDGET_PATH}`;
}
