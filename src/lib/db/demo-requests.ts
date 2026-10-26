import { z } from "zod";
import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

export const DemoRequestInputSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required." })
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: z
    .string({ required_error: "Work email is required." })
    .trim()
    .email("Please provide a valid work email address.")
    .max(120, "Email address cannot exceed 120 characters."),
  organization: z
    .string({ required_error: "Organization name is required." })
    .trim()
    .min(2, "Organization name must be at least 2 characters.")
    .max(120, "Organization name cannot exceed 120 characters."),
  useCase: z
    .string()
    .trim()
    .min(2, "Architectural focus is required.")
    .max(120, "Focus cannot exceed 120 characters.")
    .default("Enterprise Video Meetings"),
  hours: z
    .string()
    .trim()
    .min(2, "Estimated volume is required.")
    .max(60, "Estimated volume cannot exceed 60 characters.")
    .default("50-200 hours"),
});

export type DemoRequestInput = z.infer<typeof DemoRequestInputSchema>;

export interface DemoRequestRecord extends DemoRequestInput {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  persistedIn: "postgresql" | "json_fallback";
}

// In-memory sliding-window rate limiting map: key -> list of timestamps
// Note on limitations: in-memory state is local to each Node process.
// Across container restarts or in multi-instance horizontal scaling,
// distributed rate limiting (e.g. PostgreSQL or Redis token buckets) is required.
const rateLimitMap = new Map<string, number[]>();

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

export function checkRateLimit(
  identifier: string,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000
): {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
} {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(identifier) || []).filter(
    (ts) => now - ts < windowMs
  );

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetSeconds: Math.max(1, resetSeconds) };
  }

  timestamps.push(now);
  rateLimitMap.set(identifier, timestamps);

  // Periodic cleanup if map grows large
  if (rateLimitMap.size > 10000) {
    for (const [key, tsList] of rateLimitMap.entries()) {
      const active = tsList.filter((ts) => now - ts < windowMs);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const FALLBACK_FILE = path.join(DATA_DIR, "demo_requests_fallback.json");

export function getFallbackDemoRequests(): DemoRequestRecord[] {
  if (!fs.existsSync(FALLBACK_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(FALLBACK_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[DemoRequests] Failed to read fallback leads file:", err);
    return [];
  }
}

// Durable fallback staging persistence in JSON data directory when PostgreSQL is unavailable
function appendToJsonFallback(record: DemoRequestRecord): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let existing: DemoRequestRecord[] = [];
  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(FALLBACK_FILE, "utf-8"));
    } catch {
      existing = [];
    }
  }

  // Deduplication check in fallback storage (60-second window)
  const isDuplicate = existing.some(
    (item) =>
      item.email.toLowerCase() === record.email.toLowerCase() &&
      Date.now() - new Date(item.createdAt).getTime() < 60000
  );

  if (isDuplicate) {
    return;
  }

  existing.push(record);

  // Atomic write to avoid partial writes on power failure or concurrent write
  const tmpFile = `${FALLBACK_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(existing, null, 2), "utf-8");
  fs.renameSync(tmpFile, FALLBACK_FILE);
}

export async function createDemoRequest(
  input: DemoRequestInput,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<DemoRequestRecord> {
  const validated = DemoRequestInputSchema.parse(input);
  const normalizedEmail = validated.email.toLowerCase();

  // If PostgreSQL DATABASE_URL is configured, persist to PostgreSQL via Prisma
  if (process.env.DATABASE_URL) {
    try {
      // Check for rapid duplicate submission within 60 seconds
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      const existing = await prisma.demoRequest.findFirst({
        where: {
          email: normalizedEmail,
          createdAt: { gte: sixtySecondsAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return {
          id: existing.id,
          fullName: existing.fullName,
          email: existing.email,
          organization: existing.organization,
          useCase: existing.useCase,
          hours: existing.hours,
          ipAddress: existing.ipAddress,
          userAgent: existing.userAgent,
          createdAt: existing.createdAt,
          persistedIn: "postgresql",
        };
      }

      const record = await prisma.demoRequest.create({
        data: {
          fullName: validated.fullName,
          email: normalizedEmail,
          organization: validated.organization,
          useCase: validated.useCase,
          hours: validated.hours,
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ? metadata.userAgent.slice(0, 500) : null,
        },
      });

      return {
        id: record.id,
        fullName: record.fullName,
        email: record.email,
        organization: record.organization,
        useCase: record.useCase,
        hours: record.hours,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        createdAt: record.createdAt,
        persistedIn: "postgresql",
      };
    } catch (dbErr) {
      console.error(
        "[DemoRequests] PostgreSQL write error, falling back to durable JSON staging:",
        dbErr
      );
    }
  }

  // Durable fallback staging: must guarantee write or throw error
  try {
    const fallbackRecord: DemoRequestRecord = {
      id: `dr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      fullName: validated.fullName,
      email: normalizedEmail,
      organization: validated.organization,
      useCase: validated.useCase,
      hours: validated.hours,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ? metadata.userAgent.slice(0, 500) : null,
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };

    appendToJsonFallback(fallbackRecord);
    return fallbackRecord;
  } catch (fsErr) {
    console.error("[DemoRequests] FATAL: Failed to write to fallback storage:", fsErr);
    // Explicitly do not report silent success if storage failed
    throw new Error(
      "Durable lead persistence failed on both primary and fallback storage."
    );
  }
}

const SYNCED_ARCHIVE_FILE = path.join(DATA_DIR, "demo_requests_fallback.synced.json");

/**
 * Reconciliation helper to sync any leads captured in fallback storage to PostgreSQL.
 * Safe to run idempotently after database connectivity is established.
 * Successfully synced leads are atomically moved to an archive file so they are never lost,
 * while any failed leads remain in the pending fallback file for subsequent retry.
 */
export async function syncFallbackLeadsToPostgres(): Promise<{
  synced: number;
  skipped: number;
  failed: number;
}> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to sync fallback leads.");
  }

  const fallbackLeads = getFallbackDemoRequests();
  if (fallbackLeads.length === 0) {
    return { synced: 0, skipped: 0, failed: 0 };
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const remaining: DemoRequestRecord[] = [];
  const archived: Array<DemoRequestRecord & { syncedAt: string; status: string }> = [];

  for (const lead of fallbackLeads) {
    try {
      const existing = await prisma.demoRequest.findFirst({
        where: {
          email: lead.email.toLowerCase(),
          organization: lead.organization,
        },
      });

      if (existing) {
        skipped++;
        archived.push({
          ...lead,
          syncedAt: new Date().toISOString(),
          status: "skipped_duplicate",
        });
        continue;
      }

      await prisma.demoRequest.create({
        data: {
          fullName: lead.fullName,
          email: lead.email.toLowerCase(),
          organization: lead.organization,
          useCase: lead.useCase,
          hours: lead.hours,
          ipAddress: lead.ipAddress,
          userAgent: lead.userAgent,
          createdAt: new Date(lead.createdAt),
        },
      });
      synced++;
      archived.push({
        ...lead,
        syncedAt: new Date().toISOString(),
        status: "synced",
      });
    } catch (err) {
      console.error(`[DemoRequests] Failed to sync fallback lead ${lead.id}:`, err);
      failed++;
      remaining.push(lead);
    }
  }

  // Atomically update fallback file only if some leads were processed
  if (archived.length > 0) {
    try {
      const tmpPending = `${FALLBACK_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPending, JSON.stringify(remaining, null, 2), "utf-8");
      fs.renameSync(tmpPending, FALLBACK_FILE);

      let existingArchive: Array<DemoRequestRecord & { syncedAt: string; status: string }> = [];
      if (fs.existsSync(SYNCED_ARCHIVE_FILE)) {
        try {
          existingArchive = JSON.parse(fs.readFileSync(SYNCED_ARCHIVE_FILE, "utf-8"));
        } catch {
          existingArchive = [];
        }
      }
      existingArchive.push(...archived);
      const tmpArchive = `${SYNCED_ARCHIVE_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpArchive, JSON.stringify(existingArchive, null, 2), "utf-8");
      fs.renameSync(tmpArchive, SYNCED_ARCHIVE_FILE);
    } catch (fsErr) {
      console.error("[DemoRequests] Warning: Failed to update fallback archive files:", fsErr);
    }
  }

  return { synced, skipped, failed };
}
