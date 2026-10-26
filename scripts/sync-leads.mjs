#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data");
const FALLBACK_FILE = path.join(DATA_DIR, "demo_requests_fallback.json");
const ARCHIVE_FILE = path.join(DATA_DIR, "demo_requests_fallback.synced.json");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[Sync Leads] Error: DATABASE_URL is not configured in environment.");
    process.exit(1);
  }

  if (!fs.existsSync(FALLBACK_FILE)) {
    console.log("[Sync Leads] No fallback file found at", FALLBACK_FILE);
    process.exit(0);
  }

  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(FALLBACK_FILE, "utf-8"));
  } catch (err) {
    console.error("[Sync Leads] Error parsing fallback file:", err);
    process.exit(1);
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    console.log("[Sync Leads] Fallback storage is empty. 0 leads to synchronize.");
    process.exit(0);
  }

  console.log(`[Sync Leads] Processing ${leads.length} pending lead(s)...`);

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const remaining = [];
  const archived = [];

  for (const lead of leads) {
    try {
      const existing = await prisma.demoRequest.findFirst({
        where: {
          email: lead.email.toLowerCase(),
          organization: lead.organization,
        },
      });

      if (existing) {
        console.log(`[Sync Leads] Skipped duplicate: ${lead.email} (${lead.organization})`);
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
          useCase: lead.useCase || "Enterprise Video Meetings",
          hours: lead.hours || "50-200 hours",
          ipAddress: lead.ipAddress || null,
          userAgent: lead.userAgent || null,
          createdAt: new Date(lead.createdAt),
        },
      });

      console.log(`[Sync Leads] Successfully synced: ${lead.email} (${lead.organization})`);
      synced++;
      archived.push({
        ...lead,
        syncedAt: new Date().toISOString(),
        status: "synced",
      });
    } catch (err) {
      console.error(`[Sync Leads] Failed to sync ${lead.id || lead.email}:`, err.message);
      failed++;
      remaining.push(lead);
    }
  }

  // Crash-safe dual-file persistence:
  // Update archive file FIRST before removing processed leads from pending fallback
  if (archived.length > 0) {
    try {
      const processedIds = new Set(archived.map((a) => a.id));

      let existingArchive = [];
      if (fs.existsSync(ARCHIVE_FILE)) {
        try {
          existingArchive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf-8"));
        } catch {
          existingArchive = [];
        }
      }

      // Deduplicate against existing archive entries by ID to preserve idempotency
      const existingArchiveIds = new Set(existingArchive.map((a) => a.id));
      for (const lead of archived) {
        if (!existingArchiveIds.has(lead.id)) {
          existingArchive.push(lead);
        }
      }

      const tmpArchive = `${ARCHIVE_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
      fs.writeFileSync(tmpArchive, JSON.stringify(existingArchive, null, 2), "utf-8");
      fs.renameSync(tmpArchive, ARCHIVE_FILE);

      // Now that archive is durable on disk, safely update pending fallback file.
      // Re-read current pending file to avoid overwriting any concurrent leads that arrived during sync.
      let currentPending = [];
      if (fs.existsSync(FALLBACK_FILE)) {
        try {
          currentPending = JSON.parse(fs.readFileSync(FALLBACK_FILE, "utf-8"));
        } catch {
          currentPending = [];
        }
      }

      const remainingPending = currentPending.filter((lead) => !processedIds.has(lead.id));
      const tmpPending = `${FALLBACK_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
      fs.writeFileSync(tmpPending, JSON.stringify(remainingPending, null, 2), "utf-8");
      fs.renameSync(tmpPending, FALLBACK_FILE);
    } catch (fsErr) {
      console.error("[Sync Leads] Warning: Failed to update archive file:", fsErr);
    }
  }

  console.log(`[Sync Leads Complete] Synced: ${synced}, Skipped: ${skipped}, Remaining: ${failed}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[Sync Leads Fatal Error]:", e);
  await prisma.$disconnect();
  process.exit(1);
});
