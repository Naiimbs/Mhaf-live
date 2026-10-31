# MHAF Live — Database Persistence Strategy

**Status:** Proposed implementation plan  
**Scope:** Pre-Phase 3 database readiness  
**Decision owner:** Project maintainer

## 1. Executive finding

The intended architecture is PostgreSQL + Prisma as the durable application data layer. The current implementation is still hybrid:

- The main application domain is persisted in `data/mhaf_live_db.json` through `src/lib/db/index.ts`.
- The JSON store contains users, sessions, magic-link tokens, event types, availability, bookings, booking-change requests, meetings, audit logs, and processed LiveKit webhook event IDs.
- A process-local `AsyncLock` serializes operations only inside one Node.js process. It does not provide cross-process or multi-replica transaction safety.
- Demo requests are written through Prisma/PostgreSQL, with a JSON fallback when PostgreSQL is unavailable.
- `prisma/schema.prisma` currently models User, Session, EventType, Availability, Booking, AuditLog, and DemoRequest. It does not yet model all of the entities used by the JSON store or the full meeting lifecycle described in the approved data model.

This means the application is not yet ready to rely on PostgreSQL as the single source of truth or to scale horizontally.

## 2. Canonical persistence decision

Adopt PostgreSQL as the **only durable source of truth** for application-domain data, accessed through Prisma and explicit repository/service methods.

Do not introduce a second permanent persistence path. JSON should remain limited to:
- test fixtures and deterministic local development data;
- one-time import/export and recovery tooling;
- temporary migration backups retained until cutover verification.

After a verified cutover, runtime JSON fallback must not silently accept writes for transactional data. A database outage should produce an explicit, observable failure for operations that require durable persistence.

## 3. Schema reconciliation required before migration

The Prisma schema must be reconciled against both the live TypeScript domain types and the approved data-model specification.

At minimum, review and model:

| Domain | Current JSON/type representation | Required PostgreSQL model |
|---|---|---|
| Identity | User, Session, MagicLinkToken | User, Session, MagicLinkToken |
| Scheduling | EventType, Availability, Booking | EventType, Availability, Booking |
| Booking operations | BookingChangeRequest | BookingChangeRequest |
| Meeting lifecycle | Meeting | MeetingRoom / MeetingSession (or a deliberately mapped equivalent) |
| LiveKit event idempotency | processedLiveKitWebhookEvents | ProcessedWebhookEvent |
| Attendance | Not yet represented in the main Prisma schema | ParticipantEvent |
| Intelligence | Not yet represented in the main Prisma schema | Transcript, MeetingSummary |
| Audit | AuditLog | AuditLog |
| Demo requests | Prisma model + JSON fallback | DemoRequest (PostgreSQL only) |

Do not copy the approved data-model document into Prisma blindly. First reconcile field names, enum values, optionality, unique constraints, and existing TypeScript semantics. For example, the current application has `MagicLinkToken`, `BookingChangeRequest`, and `Meeting` concepts that are not identical to the current Prisma schema.

## 4. Migration approach

Use an additive, reversible migration sequence:

1. **Inventory and baseline**
   - Record the current Prisma schema and migration state.
   - Enumerate every `db.*` operation and its callers.
   - Identify JSON data files in each environment and decide whether they contain data that must be preserved.
   - Take a timestamped backup before any import or cutover.

2. **Schema completion**
   - Add the missing domain models and relations through Prisma migrations.
   - Add database-level constraints for invariants, not only application checks.
   - Keep the migration additive until the repository has switched and the data has been verified.

3. **Repository implementation**
   - Preserve the existing `db` service contract initially, replacing the JSON implementation behind it with Prisma-backed methods.
   - Use PostgreSQL transactions for multi-record operations.
   - Make webhook event processing idempotent with a unique event identifier stored in PostgreSQL.
   - Keep domain validation in the service layer; do not rely on client-side checks.

4. **Booking concurrency**
   - The current in-process lock is not sufficient across multiple Node processes.
   - Enforce booking overlap and buffer rules atomically in PostgreSQL. Evaluate a PostgreSQL exclusion constraint over a time range (including configured buffers) and/or a transaction with an explicit locking strategy.
   - Add a concurrency test that submits two conflicting bookings simultaneously and proves exactly one succeeds.

5. **Data import and cutover**
   - Build an idempotent import script for any JSON records that must be retained.
   - Validate row counts, IDs, relationships, timestamps, enum mappings, and unique keys before switching reads/writes.
   - Run a dry-run first; never overwrite or delete the source JSON during import.
   - Keep a recoverable backup until post-cutover verification is complete.

6. **DemoRequest consolidation**
   - Move the existing JSON fallback data into PostgreSQL through the same controlled import path if it contains valid records.
   - Remove runtime JSON fallback only after database persistence and operational monitoring are verified.

7. **Operational readiness**
   - Use the existing private PostgreSQL Docker service and internal network configuration.
   - Confirm `DATABASE_URL`, database health checks, persistent volume backup/restore, and Prisma migration execution in the application container.
   - Do not expose PostgreSQL's port publicly.
   - Do not deploy or migrate a production environment without explicit approval.

## 5. Phase 3 entry gate

Phase 3 (LiveKit PreJoin and Conference Room) may proceed when all of the following are true:

- Prisma schema represents the room and session lifecycle needed by token authorization.
- Booking, room, and host authorization reads come from PostgreSQL.
- Token minting rejects cancelled/expired/invalid bookings using canonical database state.
- The database enforces booking uniqueness/concurrency rules across separate processes.
- LiveKit webhook event IDs can be stored idempotently in PostgreSQL.
- Unit and integration tests cover booking transactions, room authorization, and persistence failure behavior.
- JSON fallback is either removed from runtime paths or explicitly isolated to a documented development-only mode.

The full attendance, transcript, and AI-summary models can be introduced in staged migrations when their respective phases begin, but the room/session core must exist before Phase 3 is considered complete.

## 6. Non-goals for this stage

- No production deployment.
- No destructive JSON deletion.
- No LiveKit production credential changes.
- No implementation of analytics, recording, transcription, or AI summaries before their roadmap phases.
- No horizontal scaling claim until the database and rate-limit/idempotency strategies are cross-process safe.

## 7. Acceptance checklist

- [ ] Domain inventory and JSON data-preservation decision completed.
- [ ] Prisma schema reconciled with the current TypeScript domain.
- [ ] Additive Prisma migrations reviewed and applied to a disposable PostgreSQL database.
- [ ] Prisma repository replaces JSON persistence for core domain writes and reads.
- [ ] Conflicting booking concurrency test passes across independent processes.
- [ ] Webhook idempotency is backed by a PostgreSQL unique constraint.
- [ ] DemoRequest fallback is consolidated or explicitly retained only as a temporary migration tool.
- [ ] Backup/restore and import dry-run are verified.
- [ ] Full CI passes against the PostgreSQL-backed implementation.
- [ ] Maintainer approves any production data migration or deployment separately.
