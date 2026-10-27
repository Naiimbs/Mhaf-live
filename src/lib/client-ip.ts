import { NextRequest } from "next/server";
import net from "net";

/**
 * Validates whether a given string is a syntactically valid IPv4 or IPv6 address.
 */
export function isValidIp(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  if (!trimmed) return false;
  return net.isIP(trimmed) !== 0;
}

/**
 * Checks whether an IP address is a local loopback address.
 */
export function isLoopbackIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  return (
    trimmed === "127.0.0.1" ||
    trimmed === "::1" ||
    trimmed === "::ffff:127.0.0.1" ||
    trimmed.startsWith("127.")
  );
}

/**
 * Strips brackets and port attachments from IP representations, then validates.
 */
export function cleanAndValidateIp(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let cleaned = raw.trim();
  if (cleaned.startsWith("[") && cleaned.includes("]")) {
    cleaned = cleaned.substring(1, cleaned.indexOf("]"));
  } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(":")[0];
  }
  if (!isValidIp(cleaned)) return null;
  return isLoopbackIp(cleaned) ? "127.0.0.1" : cleaned;
}

export interface ClientIpExtractionOptions {
  /**
   * Only trust X-Real-IP if explicitly configured by the deployment environment,
   * guaranteeing that the trusted reverse proxy overwrites it with {remote_host}.
   * Defaults to process.env.TRUST_X_REAL_IP === "true".
   */
  trustRealIp?: boolean;
}

/**
 * Safely extracts client IP address for rate limiting in reverse-proxy deployments.
 *
 * NETWORK TOPOLOGY & TRUST BOUNDARIES:
 * - Public Traffic Boundary:
 *   External public traffic reaches the application strictly through Caddy (ports 80/443).
 *   The application container publishes port 3000 exclusively to `127.0.0.1:18083` on the VPS host,
 *   preventing direct internet access to port 3000.
 * - Internal Docker Network Exposure:
 *   The container participates in `mhaf-network` (private app + DB network) and `proxy` (bridge shared
 *   with Caddy). Other containers attached to these internal Docker networks could reach `mhaf-live:3000`
 *   directly without traversing Caddy.
 *
 * HEADER PRECEDENCE & SPOOFING PROTECTION:
 * 1. `X-Forwarded-For` (Authoritative Rightmost Evaluation):
 *    - In Caddy reverse-proxy topologies, Caddy automatically appends the incoming TCP client address
 *      to the rightmost position in `X-Forwarded-For`:
 *        X-Forwarded-For: <client-supplied-untrusted>, <caddy-appended-peer>
 *    - This function evaluates comma-separated IPs strictly from right to left, selecting the rightmost
 *      syntactically valid IP address. Any untrusted client-supplied prefixes on the left are ignored.
 * 2. `X-Real-IP` Protection (No Silent Trust):
 *    - Default Caddy DOES NOT set or overwrite `X-Real-IP`. If an untrusted client injects
 *      an arbitrary `X-Real-IP: 1.2.3.4` and omits `X-Forwarded-For`, silently trusting `X-Real-IP`
 *      would allow trivial client spoofing.
 *    - Therefore, `X-Real-IP` is NOT silently trusted when `X-Forwarded-For` is absent or invalid,
 *      unless `trustRealIp` is explicitly enabled (e.g., via `TRUST_X_REAL_IP="true"` when Caddy
 *      is confirmed to be configured with `header_up X-Real-IP {remote_host}`).
 * 3. Next.js Runtime Compatibility & Fallback:
 *    - In Next.js standalone Node.js server, `req.ip` is not exposed by the framework, and internal
 *      Docker bridge socket peers do not reflect client IPs.
 *    - If all forwarding headers are missing or malformed, the resolver falls back to the runtime
 *      socket IP (if valid) or deterministically to `"127.0.0.1"`.
 *    - Failing safely to `"127.0.0.1"` ensures unauthenticated requests are grouped into a monitored
 *      local rate-limit bucket rather than evading rate limiting altogether.
 */
export function extractClientIp(
  req: NextRequest,
  options?: ClientIpExtractionOptions
): string {
  // 1. Rightmost valid entry in X-Forwarded-For (guaranteed appended by Caddy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const valid = cleanAndValidateIp(parts[i]);
      if (valid) {
        return valid;
      }
    }
  }

  // 2. X-Real-IP is evaluated ONLY if explicitly trusted by deployment configuration
  const trustRealIp =
    options?.trustRealIp ?? (process.env.TRUST_X_REAL_IP === "true");

  if (trustRealIp) {
    const realIp = cleanAndValidateIp(req.headers.get("x-real-ip"));
    if (realIp) {
      return realIp;
    }
  }

  // 3. Fallback to optional runtime socket IP if present
  const socketIp = (req as unknown as { ip?: string }).ip;
  const validSocketIp = cleanAndValidateIp(socketIp);
  if (validSocketIp) {
    return validSocketIp;
  }

  // 4. Deterministic safe fallback
  return "127.0.0.1";
}

export const getClientIp = extractClientIp;
