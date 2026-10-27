import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  appendToJsonFallback,
  getFallbackDemoRequests,
  syncFallbackLeadsToPostgres,
  DemoRequestRecord,
} from "../src/lib/db/demo-requests";

test.describe("Fallback Persistence & Crash-Safety Unit Tests", () => {
  const dataDir = path.join(process.cwd(), "data");
  const fallbackFile = path.join(dataDir, "demo_requests_fallback.json");

  function createMockPrisma() {
    const records: any[] = [];
    return {
      records,
      demoRequest: {
        findFirst: async ({ where }: any) => {
          return (
            records.find(
              (r) =>
                r.email.toLowerCase() === where.email.toLowerCase() &&
                r.organization === where.organization
            ) || null
          );
        },
        create: async ({ data }: any) => {
          const record = { id: `pg_${Date.now()}_${records.length}`, ...data };
          records.push(record);
          return record;
        },
      },
    };
  }

  test("appendToJsonFallback: duplicate submission within 60s returns exact persisted record without adding duplicate to disk", () => {
    const uniqueEmail = `unit_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@test.com`;
    const initialRecord: DemoRequestRecord = {
      id: `dr_test_1_${Date.now()}`,
      fullName: "Ada Lovelace",
      email: uniqueEmail,
      organization: "Analytical Engine Corp",
      useCase: "Enterprise Video Meetings",
      hours: "50-200 hours",
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };

    // First call appends
    const res1 = appendToJsonFallback(initialRecord);
    expect(res1.isDuplicate).toBe(false);
    expect(res1.record.id).toBe(initialRecord.id);

    // Read file from disk and count occurrences
    const fileContent1 = JSON.parse(fs.readFileSync(fallbackFile, "utf-8")) as DemoRequestRecord[];
    const matches1 = fileContent1.filter((r) => r.email.toLowerCase() === uniqueEmail.toLowerCase());
    expect(matches1.length).toBe(1);
    expect(matches1[0].id).toBe(initialRecord.id);

    // Second call with same email within 60s
    const secondCandidate: DemoRequestRecord = {
      id: `dr_test_PHANTOM_${Date.now()}`,
      fullName: "Ada Lovelace",
      email: uniqueEmail,
      organization: "Analytical Engine Corp",
      useCase: "Enterprise Video Meetings",
      hours: "50-200 hours",
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };

    const res2 = appendToJsonFallback(secondCandidate);
    // MUST return the actual persisted record, NOT the phantom record
    expect(res2.isDuplicate).toBe(true);
    expect(res2.record.id).toBe(initialRecord.id);
    expect(res2.record.id).not.toBe(secondCandidate.id);

    // Verify file on disk STILL contains only 1 record (no duplicate was written)
    const fileContent2 = JSON.parse(fs.readFileSync(fallbackFile, "utf-8")) as DemoRequestRecord[];
    const matches2 = fileContent2.filter((r) => r.email.toLowerCase() === uniqueEmail.toLowerCase());
    expect(matches2.length).toBe(1);
    expect(matches2[0].id).toBe(initialRecord.id);
  });

  test("Archive write failure: pending leads remain completely untouched", async () => {
    const scratchPending = path.join(dataDir, `test_archive_fail_pending_${Date.now()}.json`);
    const scratchArchive = path.join(dataDir, `test_archive_fail_archive_${Date.now()}.json`);
    const mockPrisma = createMockPrisma();

    const leads: DemoRequestRecord[] = [
      { id: "lead_A", email: "a@test.com", fullName: "Lead A", organization: "Org A", useCase: "Enterprise Video Meetings", hours: "50-200 hours", createdAt: new Date(), persistedIn: "json_fallback" },
      { id: "lead_B", email: "b@test.com", fullName: "Lead B", organization: "Org B", useCase: "Enterprise Video Meetings", hours: "50-200 hours", createdAt: new Date(), persistedIn: "json_fallback" },
    ];
    fs.writeFileSync(scratchPending, JSON.stringify(leads, null, 2), "utf-8");

    // Execute production sync helper with simulated archive write failure
    await expect(
      syncFallbackLeadsToPostgres({
        fallbackFile: scratchPending,
        archiveFile: scratchArchive,
        prismaClient: mockPrisma,
        failAtStep: "archive_write",
      })
    ).rejects.toThrow("Simulated archive write failure");

    // Pending leads must remain untouched on disk
    const pendingAfter = getFallbackDemoRequests(scratchPending);
    expect(pendingAfter.length).toBe(2);
    expect(pendingAfter.map((l) => l.id)).toEqual(["lead_A", "lead_B"]);
    // Archive file should not exist
    expect(fs.existsSync(scratchArchive)).toBe(false);

    // Cleanup
    if (fs.existsSync(scratchPending)) fs.unlinkSync(scratchPending);
    if (fs.existsSync(scratchArchive)) fs.unlinkSync(scratchArchive);
  });

  test("Pending-file write failure after archive succeeds: retry is safe, deduplicates archive and DB", async () => {
    const scratchPending = path.join(dataDir, `test_pending_fail_pending_${Date.now()}.json`);
    const scratchArchive = path.join(dataDir, `test_pending_fail_archive_${Date.now()}.json`);
    const mockPrisma = createMockPrisma();

    const leads: DemoRequestRecord[] = [
      { id: "lead_101", email: "user101@test.com", fullName: "User 101", organization: "Org 101", useCase: "Enterprise Video Meetings", hours: "50-200 hours", createdAt: new Date(), persistedIn: "json_fallback" },
    ];
    fs.writeFileSync(scratchPending, JSON.stringify(leads, null, 2), "utf-8");

    // Run 1: Fails after archive write (at pending write step)
    await expect(
      syncFallbackLeadsToPostgres({
        fallbackFile: scratchPending,
        archiveFile: scratchArchive,
        prismaClient: mockPrisma,
        failAtStep: "pending_write",
      })
    ).rejects.toThrow("Simulated pending write failure");

    // Archive has the record, DB has the record, but pending file still has the record
    expect(fs.existsSync(scratchArchive)).toBe(true);
    expect(getFallbackDemoRequests(scratchPending).length).toBe(1);
    expect(mockPrisma.records.length).toBe(1);

    // Run 2: Retry sync without failure
    const retryResult = await syncFallbackLeadsToPostgres({
      fallbackFile: scratchPending,
      archiveFile: scratchArchive,
      prismaClient: mockPrisma,
    });

    expect(retryResult.skipped).toBe(1);
    expect(retryResult.synced).toBe(0);

    // Database still has only 1 record (no duplicate DB inserts)
    expect(mockPrisma.records.length).toBe(1);

    // Archive still has only 1 entry (no duplicate archive entries)
    const archiveRecords = JSON.parse(fs.readFileSync(scratchArchive, "utf-8"));
    expect(archiveRecords.length).toBe(1);
    expect(archiveRecords[0].id).toBe("lead_101");

    // Pending file is now cleared
    expect(getFallbackDemoRequests(scratchPending).length).toBe(0);

    // Cleanup
    if (fs.existsSync(scratchPending)) fs.unlinkSync(scratchPending);
    if (fs.existsSync(scratchArchive)) fs.unlinkSync(scratchArchive);
  });

  test("Malformed pending/archive JSON: preserves recoverable source data and does not silently overwrite", async () => {
    const scratchPending = path.join(dataDir, `test_corrupt_pending_${Date.now()}.json`);
    const scratchArchive = path.join(dataDir, `test_corrupt_archive_${Date.now()}.json`);
    const mockPrisma = createMockPrisma();

    // Step A: Corrupt pending file
    const corruptContent = `{"malformed_json": [missing_brackets`;
    fs.writeFileSync(scratchPending, corruptContent, "utf-8");

    // Reading corrupt pending leads returns empty array safely and creates .corrupt.<timestamp> backup
    const loaded = getFallbackDemoRequests(scratchPending);
    expect(loaded).toEqual([]);

    // Verify backup exists with corrupt content preserved
    const createdFiles = fs.readdirSync(dataDir);
    const pendingCorruptBackups = createdFiles.filter((f) => f.startsWith(path.basename(scratchPending)) && f.includes(".corrupt."));
    expect(pendingCorruptBackups.length).toBeGreaterThan(0);
    const backupContent = fs.readFileSync(path.join(dataDir, pendingCorruptBackups[0]), "utf-8");
    expect(backupContent).toBe(corruptContent);

    // Step B: Corrupt archive file during sync
    const corruptArchiveContent = `{"bad_archive": true, truncated`;
    fs.writeFileSync(scratchArchive, corruptArchiveContent, "utf-8");

    const validLead: DemoRequestRecord = {
      id: "lead_valid_1",
      email: "valid@test.com",
      fullName: "Valid User",
      organization: "Valid Org",
      useCase: "Enterprise Video Meetings",
      hours: "50-200 hours",
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };
    fs.writeFileSync(scratchPending, JSON.stringify([validLead], null, 2), "utf-8");

    // Run sync against corrupt archive
    const syncRes = await syncFallbackLeadsToPostgres({
      fallbackFile: scratchPending,
      archiveFile: scratchArchive,
      prismaClient: mockPrisma,
    });

    expect(syncRes.synced).toBe(1);

    // Verify archive corrupt backup was created
    const archiveFiles = fs.readdirSync(dataDir);
    const archiveCorruptBackups = archiveFiles.filter((f) => f.startsWith(path.basename(scratchArchive)) && f.includes(".corrupt."));
    expect(archiveCorruptBackups.length).toBeGreaterThan(0);
    const archiveBackupContent = fs.readFileSync(path.join(dataDir, archiveCorruptBackups[0]), "utf-8");
    expect(archiveBackupContent).toBe(corruptArchiveContent);

    // Cleanup scratch and backup files
    if (fs.existsSync(scratchPending)) fs.unlinkSync(scratchPending);
    if (fs.existsSync(scratchArchive)) fs.unlinkSync(scratchArchive);
    for (const f of [...pendingCorruptBackups, ...archiveCorruptBackups]) {
      const p = path.join(dataDir, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  test("Concurrent submissions during reconciliation: newly appended leads are strictly preserved", async () => {
    const scratchPending = path.join(dataDir, `test_concurrent_pending_${Date.now()}.json`);
    const scratchArchive = path.join(dataDir, `test_concurrent_archive_${Date.now()}.json`);

    const initialLead: DemoRequestRecord = {
      id: "lead_initial",
      email: "initial@test.com",
      fullName: "Initial Lead",
      organization: "Initial Org",
      useCase: "Enterprise Video Meetings",
      hours: "50-200 hours",
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };
    fs.writeFileSync(scratchPending, JSON.stringify([initialLead], null, 2), "utf-8");

    const concurrentLead: DemoRequestRecord = {
      id: "lead_concurrent",
      email: "concurrent@test.com",
      fullName: "Concurrent Lead",
      organization: "Concurrent Org",
      useCase: "Enterprise Video Meetings",
      hours: "50-200 hours",
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };

    // Custom mock prisma that appends concurrent lead to scratchPending during reconciliation query
    let injected = false;
    const mockPrisma = {
      demoRequest: {
        findFirst: async () => {
          if (!injected) {
            injected = true;
            // Append concurrent lead to disk while sync is actively running
            appendToJsonFallback(concurrentLead, scratchPending);
          }
          return null;
        },
        create: async ({ data }: any) => ({ id: `pg_${Date.now()}`, ...data }),
      },
    };

    const res = await syncFallbackLeadsToPostgres({
      fallbackFile: scratchPending,
      archiveFile: scratchArchive,
      prismaClient: mockPrisma,
    });

    expect(res.synced).toBe(1);

    // Verify remaining pending on disk contains the concurrent lead
    const remainingOnDisk = getFallbackDemoRequests(scratchPending);
    expect(remainingOnDisk.length).toBe(1);
    expect(remainingOnDisk[0].id).toBe("lead_concurrent");

    // Cleanup
    if (fs.existsSync(scratchPending)) fs.unlinkSync(scratchPending);
    if (fs.existsSync(scratchArchive)) fs.unlinkSync(scratchArchive);
  });

  test("Repeated synchronization: operations remain idempotent", async () => {
    const scratchPending = path.join(dataDir, `test_idempotent_pending_${Date.now()}.json`);
    const scratchArchive = path.join(dataDir, `test_idempotent_archive_${Date.now()}.json`);
    const mockPrisma = createMockPrisma();

    const lead: DemoRequestRecord = {
      id: "lead_idem_1",
      email: "idempotent@test.com",
      fullName: "Idem User",
      organization: "Idem Org",
      useCase: "Enterprise Video Meetings",
      hours: "50-200 hours",
      createdAt: new Date(),
      persistedIn: "json_fallback",
    };

    // First sync
    fs.writeFileSync(scratchPending, JSON.stringify([lead], null, 2), "utf-8");
    const res1 = await syncFallbackLeadsToPostgres({
      fallbackFile: scratchPending,
      archiveFile: scratchArchive,
      prismaClient: mockPrisma,
    });
    expect(res1.synced).toBe(1);
    expect(res1.skipped).toBe(0);

    // Second sync: re-add same lead to pending
    fs.writeFileSync(scratchPending, JSON.stringify([lead], null, 2), "utf-8");
    const res2 = await syncFallbackLeadsToPostgres({
      fallbackFile: scratchPending,
      archiveFile: scratchArchive,
      prismaClient: mockPrisma,
    });
    expect(res2.synced).toBe(0);
    expect(res2.skipped).toBe(1);

    // Assert DB and archive have no duplicate entries
    expect(mockPrisma.records.length).toBe(1);
    const archiveData = JSON.parse(fs.readFileSync(scratchArchive, "utf-8"));
    expect(archiveData.length).toBe(1);

    // Cleanup
    if (fs.existsSync(scratchPending)) fs.unlinkSync(scratchPending);
    if (fs.existsSync(scratchArchive)) fs.unlinkSync(scratchArchive);
  });
});
