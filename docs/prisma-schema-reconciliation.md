# MHAF Live — Prisma Schema Reconciliation

**Status:** Static reconciliation draft — review required  
**Baseline:** `master` (repository snapshot inspected 2026-10-31)  
**Scope:** Compare the live TypeScript persistence contract, JSON-backed repository behavior, Prisma schema, and tracked initial SQL migration.  
**Safety:** Documentation only. No runtime code, database, migration, credentials, or deployment configuration changed.

## 1. Executive finding

The current Prisma schema and initial migration are **not yet a drop-in persistence replacement** for `src/lib/db/index.ts`.

The application repository currently persists ten collections in `data/mhaf_live_db.json`. The Prisma schema covers only a subset of that contract. A safe migration therefore requires additive schema work, explicit behavior mapping, and a transaction/concurrency design before switching the repository implementation.

This document is based on source files available on `master`; it is not a read of any deployed PostgreSQL database.

## 2. TypeScript-to-Prisma model reconciliation

| Runtime TypeScript contract | Prisma / initial migration | Required decision |
|---|---|---|
| `User` | Model exists. Prisma `passwordHash` and `name` are nullable; TypeScript requires `passwordHash: string` and permits `name: string \| null`. | Confirm whether passwordless accounts may have no password hash. Align TypeScript and database nullability deliberately; do not infer from the older schema. |
| `Session` | Model exists with unique `sessionToken`, user FK and expiry. | Retain. Confirm cleanup/expiry policy; expired sessions are filtered at read time in JSON. |
| `MagicLinkToken` | Missing. Runtime stores `id`, `tokenHash`, `userId`, `expires`, `consumedAt`, `createdAt`. | Add model, user relation, indexed lookup by token hash, and uniqueness for token hash. Token consumption must be atomic and one-time. |
| `EventType` | Model exists with host-scoped unique slug and duration/buffers. | Preserve host relation and fields. Resolve case-insensitive slug behavior and whether inactive slugs may be reused before selecting a unique-index strategy. |
| `Availability` | Model exists with weekday, time strings and timezone. | Retain. Confirm whether multiple intervals per weekday are supported; current runtime replaces all host rows on update. |
| `Booking` | Model exists, but omits multiple fields present in the runtime interface and JSON store. | Add lifecycle, management-link, email-delivery and reminder fields listed below. Preserve existing IDs and UIDs during import. |
| `BookingChangeRequest` | Missing. Runtime supports CANCEL/RESCHEDULE, PENDING/APPROVED/REJECTED, requested time, host response and resolution timestamps. | Add model, enums, booking/host relations, and indexes for host/status/booking access. |
| `Meeting` | Missing. Runtime uses BOOKING/MANUAL/INSTANT sources and SCHEDULED/LIVE/CANCELLED/COMPLETED statuses. | Add model and enums. Decide whether a booking-origin meeting is one-to-one with Booking and whether `bookingId` is nullable/unique. |
| Processed LiveKit webhook event IDs | Missing. Runtime keeps a bounded array of processed event IDs. | Add durable idempotency table with unique provider event ID; define retention/cleanup without weakening replay protection. |
| `AuditLog` | Model exists. | Retain; confirm all sensitive runtime operations write logs consistently. |
| Demo requests | Model exists, but `src/lib/db/demo-requests.ts` uses a separate Prisma-first path with JSON fallback. | Treat as a separate cutover stream; remove fallback only after data reconciliation and failure-mode tests. |

## 3. Booking fields missing from Prisma

The TypeScript `Booking` interface and JSON serialization include these optional fields which are absent from the current Prisma model and initial SQL migration:

- `lastLeftAt DateTime?`
- `completedAt DateTime?`
- `managementTokenHash String?`
- `managementTokenExpiresAt DateTime?`
- `confirmationEmailSentAt DateTime?`
- `confirmationEmailError String?`
- `reminder15SentAt DateTime?`
- `reminder5SentAt DateTime?`

The current runtime uses these fields for room expiry/re-entry, attendee self-management, confirmation email tracking, and reminder deduplication. They are not cosmetic fields; omitting them would change observable behavior after a repository switch.

## 4. Runtime semantics that schema parity alone will not preserve

### 4.1 Email and slug comparison

- JSON user lookup and duplicate detection compare email addresses case-insensitively.
- The current Prisma unique constraint on `User.email` is a normal case-sensitive unique index unless values are normalized before writes.
- Event-type slug lookup compares case-insensitively, while Prisma's `@@unique([hostId, slug])` is case-sensitive and also constrains inactive rows.

**Decision required:** normalize email and slug at the service boundary, or use database-level case-insensitive constraints where appropriate. Decide whether inactive event-type slugs remain reserved. Add tests for mixed-case duplicates and reactivation.

### 4.2 Booking and meeting conflict protection

The JSON repository uses a process-local `AsyncLock` and in-memory interval checks. The Prisma index `Booking(hostId, startTime, endTime)` accelerates queries but does **not** prevent overlapping reservations under concurrent requests or multiple application processes.

Before PostgreSQL cutover, implement and test cross-process conflict protection. Evaluate a PostgreSQL exclusion constraint over a range representation (with a clear policy for buffers and active statuses), or a transaction/locking strategy that serializes conflict checks per host. Booking conflicts must include the same booking buffers and MANUAL meeting rules as the current runtime.

### 4.3 Multi-record atomic operations

The following current repository operations mutate multiple records or related state and must become PostgreSQL transactions:

- `createUser`: creates the user, default event type, and weekday availability.
- `updateAvailability`: removes existing host availability and inserts the replacement set.
- `resolveBookingChangeRequest`: resolves the request and may update booking, linked meeting, and reminder timestamps.
- `cancelBooking`: cancels the booking and its linked meeting.
- `createMeetingWithConflictLock`: for INSTANT meetings, completes prior scheduled instant meetings before creating the new meeting.
- `processLiveKitWebhookEvent`: records event idempotency and updates booking/meeting room lifecycle state.
- `isRoomExpired`: may complete both a booking and its linked meeting.

A partial commit would leave inconsistent scheduling or room state.

### 4.4 LiveKit webhook idempotency

The JSON store deduplicates by provider event ID and caps the in-memory persisted list at 10,000 entries. PostgreSQL should enforce uniqueness on the event ID so concurrent webhook deliveries cannot process the same event twice. Retention should be a separately documented policy; do not rely on process memory or a non-atomic read-then-insert.

### 4.5 Startup seeding and malformed JSON behavior

The JSON repository currently seeds a default host/event type/availability set when the store has no users. It also catches file read/parse failures and falls back to an empty store. These behaviors must not be copied blindly into PostgreSQL:

- Define an explicit, one-time bootstrap path for the first host.
- Never silently interpret a database or import failure as an empty production database.
- Make JSON import validation and recovery explicit before disabling the existing store.

## 5. Relationship and domain-boundary decisions

The approved architecture/data-model documents describe a richer LiveKit domain with `MeetingRoom`, `MeetingSession`, `ParticipantEvent`, `Transcript`, and `MeetingSummary`. The current runtime repository instead models a simpler `Meeting` plus `Booking` lifecycle and processes LiveKit JOIN/LEAVE webhooks by room UID.

These are not currently the same model. Do not add all architecture-level entities to the runtime migration merely because they appear in the blueprint. First decide whether the present persistence migration is:

1. **Runtime parity first:** reproduce the existing Booking/Meeting behavior in PostgreSQL, then add session/participant/intelligence models in their own feature phases; or
2. **Combined domain migration:** introduce the complete MeetingRoom/MeetingSession model now, with a separately reviewed mapping from existing Meeting and Booking records.

The lower-risk sequence is runtime parity first, unless an active implementation branch already depends on the richer session model.

## 6. Initial migration and metadata observations

The tracked migration `prisma/migrations/20261026000000_init/migration.sql` creates:

- User, Session, EventType, Availability, Booking, AuditLog and DemoRequest tables;
- UserRole and BookingStatus enums;
- current unique/index/FK definitions.

It does not create MagicLinkToken, BookingChangeRequest, Meeting, LiveKit processed-event storage, or the additional Booking lifecycle/management/email/reminder columns.

A lookup for `prisma/migrations/migration_lock.toml` on the inspected repository snapshot returned 404. Confirm whether this file is absent from the tracked tree and how the deployed environment records its migration provider before generating/applying migrations.

**No deployed database state was inspected.** The presence of an initial migration in Git does not prove that it has or has not been applied to staging or production. Read-only inspection of `_prisma_migrations`, schema drift, backups and environment ownership is a separate gated task.

## 7. Proposed additive migration order

1. Confirm model decisions in Sections 2 and 5, especially passwordless User nullability and Meeting versus MeetingRoom.
2. Add MagicLinkToken, BookingChangeRequest, Meeting, their enums/relations/indexes, webhook idempotency storage, and missing Booking fields.
3. Add case-insensitive uniqueness and booking-conflict protection only after the intended normalization, inactive-slug and buffer semantics are approved.
4. Generate an additive migration against a disposable PostgreSQL database; inspect the SQL manually.
5. Run Prisma validation, migration apply, generated-client build, and repository contract tests against disposable PostgreSQL.
6. Implement a Prisma repository behind the existing `db` contract; do not switch production reads/writes in this phase.
7. Build an idempotent JSON importer and validate row counts, IDs, foreign keys, timestamps, enum values, duplicate emails/slugs, and booking overlaps.
8. Perform backup/restore and rollback rehearsals in a non-production environment.
9. Switch staging only after parity tests; production cutover requires explicit approval and a verified backup.

## 8. Verification still required before implementation

- Complete the repository-wide caller scan for dynamic/destructured `db` access, server actions, tests/mocks, and consumers outside the first-pass source set. The four methods marked as having no direct caller in `docs/persistence-inventory.md` remain unresolved; absence from code-search results is not proof of dead code.
- Inspect all migration files and confirm migration metadata in the repository.
- Read the deployed PostgreSQL migration state through an approved read-only connection before any migration plan is treated as deployable.
- Confirm whether any active feature branch already uses `MeetingRoom`, `MeetingSession`, or `ParticipantEvent` persistence.
- Add tests that lock down current behavior for case-insensitive email/slug handling, booking buffers, reschedule conflict checks, room re-entry/expiry, webhook retries, and reminder deduplication.

### 8.1 Targeted feature-branch schema check

The Prisma schema was also read from the following existing branches: `feat/meeting-experience-and-recording`, `feature/livekit-video-rooms`, and `feature/assisted-onboarding`. In the inspected snapshots, all three carry the same limited Prisma model set as `master`; none adds `MeetingRoom`, `MeetingSession`, `ParticipantEvent`, `Transcript`, or `MeetingSummary`. This is a targeted schema-file comparison only, not a full branch diff or proof that no application code on those branches references the richer model.

The repository-wide caller inventory remains incomplete. The available GitHub code-search queries for the four unresolved method names returned no indexed matches, but this is not sufficient evidence to classify them as dead code. A complete file-tree scan and inspection of test/mocks, destructured calls, and dynamic access are still required.

## 9. Explicit non-actions

This reconciliation does not:

- modify `schema.prisma`, SQL migrations, TypeScript runtime code, or production data;
- run `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, database resets, or destructive SQL;
- inspect or export secrets, tokens, or user data;
- switch the JSON repository to Prisma;
- deploy to staging or production;
- merge PR #42 or any other open pull request.


### 8.2 Repository-wide caller scan — `master` snapshot

A direct file-tree inspection was completed for the repository's tracked TypeScript source under `src/app/api`, `src/lib`, and `tests`. All API route handlers in the tree were checked for direct persistence calls, along with the shared auth/session module and persistence-related test files. The following caller groups were confirmed:

| Caller area | Confirmed persistence usage |
|---|---|
| Auth magic-link request and verification | User lookup/creation, recent-token check, token creation/deletion and atomic token consumption |
| Shared auth/session service | Session lookup/create/delete and user lookup/creation |
| Auth settings | User timezone update |
| Calendar and connection details | Meetings, bookings, event types, room expiry |
| Schedule availability and event types | Availability read/replace, timezone update, event-type list/create |
| Public booking flow | Booking creation with conflict lock; user/event lookup; confirmation-email status update |
| Booking management and host workspace | Booking lookup, management token update, change-request create/read/resolve, cancellation |
| Meeting and instant-room endpoints | Meeting create/cancel with conflict lock |
| LiveKit webhook and connection details | Webhook event processing and room lifecycle/expiry |
| Internal booking reminder endpoint | Due-reminder query, related user/event lookup, reminder sent marker |
| Demo request endpoint | Separate `createDemoRequest` flow; Prisma-first with JSON fallback |
| Demo-request unit tests | Mock Prisma client for fallback lead reconciliation; no direct tests against the main `db` singleton found in inspected test files |

The route scan also found a dynamic import in the public booking route for a post-create booking lookup. It was included in the caller map; a static-import-only scan would miss it.

**Limitations:** GitHub's code-search endpoint returned no indexed matches for the queried `db.*` method symbols, so it was not used as evidence of absence. The file-tree/manual scan is stronger, but it is not a proof against reflection, string-based dynamic property access, generated code, or external consumers. No direct references were observed in the inspected route handlers/tests for `recordRoomParticipantLeave` and `recordRoomParticipantJoin`; these remain part of the exported runtime contract and must not be removed without a wider usage decision. The four methods identified by PR #42's first-pass caller map with no direct runtime caller remain: `getEventTypeBySlug`, `findMeetingById`, `recordRoomParticipantLeave`, and `recordRoomParticipantJoin`. The expanded route/auth/test scan did not reveal direct callers for these methods either. Keep them in the repository contract until an explicit retain/remove decision is made; absence of a direct caller is not proof that they are safe to delete.

**Conclusion:** the route/auth/test caller scan materially extends PR #42's first pass. The four methods above remain unclassified rather than being treated as dead code. The remaining work is a symbol-by-symbol cross-reference for every exported repository method, including page-level consumers and any dynamic/destructured access, followed by contract tests for behavior reached only indirectly.
