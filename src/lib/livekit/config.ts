export interface LiveKitSettings {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export type LiveKitSettingsResult =
  | { ok: true; settings: LiveKitSettings }
  | { ok: false; error: string };

type LiveKitEnvironment = Record<string, string | undefined>;

const isPlaceholder = (value: string) =>
  /^(devkey|secret)$/i.test(value) || /placeholder|replace[_ -]?with/i.test(value);

export function resolveLiveKitSettings(env: LiveKitEnvironment): LiveKitSettingsResult {
  const production = env.NODE_ENV === "production";
  const url = env.LIVEKIT_URL?.trim() || env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || (!production ? "ws://127.0.0.1:7880" : "");
  const apiKey = env.LIVEKIT_API_KEY?.trim() || (!production ? "devkey" : "");
  const apiSecret = env.LIVEKIT_API_SECRET?.trim() || (!production ? "secret" : "");
  const missing = [
    !url ? "LIVEKIT_URL" : null,
    !apiKey ? "LIVEKIT_API_KEY" : null,
    !apiSecret ? "LIVEKIT_API_SECRET" : null,
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    return {
      ok: false,
      error: `LiveKit is not configured on the server. Set ${missing.join(", ")}.`,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, error: "LiveKit server URL is invalid." };
  }

  if ((parsedUrl.protocol !== "wss:" && parsedUrl.protocol !== "ws:") || parsedUrl.username || parsedUrl.password) {
    return { ok: false, error: "LiveKit server URL must be a ws:// or wss:// URL without embedded credentials." };
  }

  if (production) {
    const hostname = parsedUrl.hostname.toLowerCase();
    if (parsedUrl.protocol !== "wss:") {
      return { ok: false, error: "Production LiveKit server URL must use wss://." };
    }
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(hostname)) {
      return { ok: false, error: "Production LiveKit server URL cannot point to this server's loopback address." };
    }
    if (isPlaceholder(apiKey) || isPlaceholder(apiSecret)) {
      return { ok: false, error: "Production LiveKit API credentials are missing or still contain development placeholders." };
    }
  }

  return { ok: true, settings: { url, apiKey, apiSecret } };
}
