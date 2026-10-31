interface RateLimitEntry {
  windowStartedAt: number;
  count: number;
}

const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Small per-process fixed-window limiter for the single-instance deployment.
 * This is intentionally dependency-free; it is not a distributed limiter.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const current = buckets.get(key);
  if (!current || now - current.windowStartedAt >= windowMs || now < current.windowStartedAt) {
    buckets.set(key, { windowStartedAt: now, count: 1 });
    if (buckets.size > 10000) {
      for (const [bucketKey, entry] of buckets) {
        if (now - entry.windowStartedAt >= windowMs || now < entry.windowStartedAt) {
          buckets.delete(bucketKey);
        }
      }
    }
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.windowStartedAt + windowMs - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count), retryAfterSeconds: 0 };
}