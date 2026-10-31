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
  isDuplicate?: boolean;
}

/**
 * In-memory sliding-window rate limiting map: identifier -> array of request timestamps.
 *
 * ARCHITECTURAL LIMITATIONS & SCOPE:
 * 1. Process-local scope:
 *    Rate limit state is stored strictly in the memory heap of this Node.js process.
 *    It is NOT shared across separate processes, threads, or horizontally scaled container replicas.
 * 2. Volatile lifetime:
 *    State resets on container restart, zero-downtime container swap, or process restart.
 * 3. Scope & current thresholds:
 *    - IP scope: 10 requests per 15-minute sliding window (`ip:<client_ip>`).
 *    - Email scope: 3 requests per 15-minute sliding window (`email:<normalized_email>`).
 * 4. Architectural justification:
 *    For MHAF Live's single-container architecture on the VPS, an in-memory sliding window
 *    provides immediate, zero-latency denial-of-service and form-stuffing protection without
 *    adding an external Redis dependency or inflicting write amplification on PostgreSQL
 *    for every incoming spam attempt. In a future multi-container cluster, distributed token
 *    buckets in PostgreSQL or Redis can replace this map.
 */
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

const DATA_DIR = process.env.MHAF_DATA_DIR?.trim() || path.join(process.cwd(), "data");
const FALLBACK_FILE = path.join(DATA_DIR, "demo_requests_fallback.json");

export function getFallbackDemoRequests(filePath?: string): DemoRequestRecord[] {
  const targetFile = filePath || FALLBACK_FILE;
  if (!fs.existsSync(targetFile)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(targetFile, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[DemoRequests] Failed to read fallback leads file, preserving corrupt data:", err);
    try {
      const corruptBackup = `${targetFile}.corrupt.${Date.now()}`;
      fs.copyFileSync(targetFile, corruptBackup);
      console.warn(`[DemoRequests] Corrupt file preserved to: ${corruptBackup}`);
    } catch {
      // ignore copy failure
    }
    return [];
  }
}

/**
 * Durable fallback staging persistence in JSON data directory when PostgreSQL is unavailable.
 * If a submission with the same email exists within the 60-second deduplication window,
 * this function returns the EXACT persisted record already stored on disk and does NOT
 * write a duplicate or return an unwritten phantom record.
 */
export function appendToJsonFallback(
  record: DemoRequestRecord,
  targetFilePath?: string
): {
  record: DemoRequestRecord;
  isDuplicate: boolean;
} {
  const targetFile = targetFilePath || FALLBACK_FILE;
  const targetDir = path.dirname(targetFile);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let existing: DemoRequestRecord[] = [];
  if (fs.existsSync(targetFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
    } catch (err) {
      console.error("[DemoRequests] Malformed JSON in fallback file, preserving corrupt data:", err);
      try {
        const corruptBackup = `${targetFile}.corrupt.${Date.now()}`;
        fs.copyFileSync(targetFile, corruptBackup);
        console.warn(`[DemoRequests] Corrupt file preserved to: ${corruptBackup}`);
      } catch {
        // ignore copy failure
      }
      existing = [];
    }
  }

  const normalizedEmail = record.email.toLowerCase();
  const sixtySecondsAgo = Date.now() - 60000;

  // Deduplication check in fallback storage (60-second window)
  const existingDuplicate = existing
    .filter(
      (item) =>
        item.email.toLowerCase() === normalizedEmail &&
        new Date(item.createdAt).getTime() >= sixtySecondsAgo
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

  if (existingDuplicate) {
    // Return the actual record stored on disk rather than returning an unwritten ghost ID
    return {
      record: {
        ...existingDuplicate,
        createdAt: new Date(existingDuplicate.createdAt),
        persistedIn: "json_fallback",
        isDuplicate: true,
      },
      isDuplicate: true,
    };
  }

  existing.push(record);

  // Atomic write to avoid partial writes on power failure or concurrent write
  const tmpFile = `${targetFile}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(existing, null, 2), "utf-8");
  fs.renameSync(tmpFile, targetFile);

  return {
    record: {
      ...record,
      isDuplicate: false,
    },
    isDuplicate: false,
  };
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
          isDuplicate: true,
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
        isDuplicate: false,
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
    const candidateRecord: DemoRequestRecord = {
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

    const result = appendToJsonFallback(candidateRecord);
    return {
      ...result.record,
      isDuplicate: result.isDuplicate,
    };
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
 *
 * CRASH-SAFETY & RECOVERY ARCHITECTURE:
 * Note: POSIX and Windows filesystems do not support atomic multi-file transactions across separate files.
 * To achieve crash resilience without risking data loss:
 * 1. Processed leads are written to `SYNCED_ARCHIVE_FILE` FIRST using an atomic write-and-rename.
 * 2. Deduplication by lead ID ensures idempotent reconciliation even if multiple runs occur.
 * 3. Only after the archive is durable on disk, the pending `FALLBACK_FILE` is re-read and updated
 *    by removing only the successfully processed lead IDs. This guarantees any new concurrent
 *    leads that arrived during the sync run are completely preserved.
 * 4. If any failure occurs during archive writing, `FALLBACK_FILE` is completely untouched.
 */
export async function syncFallbackLeadsToPostgres(options?: {
  fallbackFile?: string;
  archiveFile?: string;
  prismaClient?: any;
  failAtStep?: "archive_write" | "pending_write";
}): Promise<{
  synced: number;
  skipped: number;
  failed: number;
}> {
  const fallbackFile = options?.fallbackFile || FALLBACK_FILE;
  const archiveFile = options?.archiveFile || SYNCED_ARCHIVE_FILE;
  const dbClient = options?.prismaClient || prisma;

  if (!process.env.DATABASE_URL && !options?.prismaClient) {
    throw new Error("DATABASE_URL is required to sync fallback leads.");
  }

  const fallbackLeads = getFallbackDemoRequests(fallbackFile);
  if (fallbackLeads.length === 0) {
    return { synced: 0, skipped: 0, failed: 0 };
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const processedLeads: Array<DemoRequestRecord & { syncedAt: string; status: "synced" | "skipped_duplicate" }> = [];

  for (const lead of fallbackLeads) {
    try {
      const existing = await dbClient.demoRequest.findFirst({
        where: {
          email: lead.email.toLowerCase(),
          organization: lead.organization,
        },
      });

      if (existing) {
        skipped++;
        processedLeads.push({
          ...lead,
          syncedAt: new Date().toISOString(),
          status: "skipped_duplicate",
        });
        continue;
      }

      await dbClient.demoRequest.create({
        data: {
          fullName: lead.fullName,
          email: lead.email.toLowerCase(),
          organization: lead.organization,
          useCase: lead.useCase || "Enterprise Video Meetings",
          hours: lead.hours || "50-200 hours",
          ipAddress: lead.ipAddress,
          userAgent: lead.userAgent,
          createdAt: new Date(lead.createdAt),
        },
      });
      synced++;
      processedLeads.push({
        ...lead,
        syncedAt: new Date().toISOString(),
        status: "synced",
      });
    } catch (err) {
      console.error(`[DemoRequests] Failed to sync fallback lead ${lead.id}:`, err);
      failed++;
      // Not added to processedLeads, so remains in pending fallback for future retry
    }
  }

  // Crash-safe dual-file persistence:
  if (processedLeads.length > 0) {
    const processedIds = new Set(processedLeads.map((p) => p.id));

    if (options?.failAtStep === "archive_write") {
      throw new Error("Simulated archive write failure");
    }

    // Step 1: Update archive file first
    let existingArchive: Array<DemoRequestRecord & { syncedAt: string; status: string }> = [];
    if (fs.existsSync(archiveFile)) {
      try {
        existingArchive = JSON.parse(fs.readFileSync(archiveFile, "utf-8"));
      } catch (e) {
        console.error("[DemoRequests] Warning: Corrupt archive file encountered, backing up:", e);
        const corruptBackup = `${archiveFile}.corrupt.${Date.now()}`;
        try {
          fs.copyFileSync(archiveFile, corruptBackup);
        } catch {
          // ignore backup failure
        }
        existingArchive = [];
      }
    }

    // Deduplicate against existing archive entries by ID to preserve idempotency
    const existingArchiveIds = new Set(existingArchive.map((a) => a.id));
    for (const lead of processedLeads) {
      if (!existingArchiveIds.has(lead.id)) {
        existingArchive.push(lead);
      }
    }

    const archiveDir = path.dirname(archiveFile);
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    const tmpArchive = `${archiveFile}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
    fs.writeFileSync(tmpArchive, JSON.stringify(existingArchive, null, 2), "utf-8");
    fs.renameSync(tmpArchive, archiveFile);

    if (options?.failAtStep === "pending_write") {
      throw new Error("Simulated pending write failure");
    }

    // Step 2: Now that archive is durable on disk, safely update pending fallback file.
    // Re-read current pending file to avoid overwriting any concurrent leads that arrived during sync.
    let currentPending: DemoRequestRecord[] = [];
    if (fs.existsSync(fallbackFile)) {
      try {
        currentPending = JSON.parse(fs.readFileSync(fallbackFile, "utf-8"));
      } catch (err) {
        console.error("[DemoRequests] Malformed JSON in fallback file during reconciliation, preserving corrupt data:", err);
        try {
          const corruptBackup = `${fallbackFile}.corrupt.${Date.now()}`;
          fs.copyFileSync(fallbackFile, corruptBackup);
        } catch {
          // ignore copy failure
        }
        currentPending = [];
      }
    }

    const remainingPending = currentPending.filter((lead) => !processedIds.has(lead.id));
    const pendingDir = path.dirname(fallbackFile);
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
    }
    const tmpPending = `${fallbackFile}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
    fs.writeFileSync(tmpPending, JSON.stringify(remainingPending, null, 2), "utf-8");
    fs.renameSync(tmpPending, fallbackFile);
  }

  return { synced, skipped, failed };
}
