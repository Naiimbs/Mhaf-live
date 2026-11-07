# MHAF Live — Repository Contract Test Plan

**Status:** Test design for review; not yet implemented  
**Baseline:** `master` repository snapshot inspected 2026-11-01  
**Related documents:** `docs/persistence-caller-map.md`, `docs/prisma-schema-reconciliation.md`, `docs/persistence-contract-map.md`  
**Scope:** Define one behavioral contract that the current JSON repository and a future Prisma repository must both satisfy.  
**Safety:** Documentation only. No runtime code, tests, schema, database, credentials, or deployment configuration changed.

## 1. Objective and exit criteria

The migration must not change externally observable repository behavior unintentionally. The same contract scenarios must pass against:

1. The current JSON-backed repository (baseline).
2. The future Prisma-backed repository (candidate).
3. The migration/import path where a scenario depends on persisted legacy data.

A test passing against JSON alone is a baseline, not proof of Prisma parity.

**Exit criteria before switching the application to Prisma:**

- Every in-scope contract group below passes against both adapters.
- Tests use isolated disposable data and never point at production.
- Cross-process race tests demonstrate the database-level guarantees required below; process-local mutex tests are insufficient.
- Error/null/boolean/result semantics, ordering, time boundaries, case handling, and related-record updates are asserted.
- Import parity tests verify IDs, UIDs, dates, nullable fields, enum values, and relationships.
- Existing unit and E2E suites pass without weakening assertions.
- A failed transaction leaves no partial records or status changes.
- The test report records adapter, database version, migration revision, and test run identifier.

## 2. Current test environment — verified facts

From the checked-in `package.json`:

- Unit tests run with `node --experimental-strip-types --test tests/unit/*.test.ts`.
- E2E tests run with `playwright test`.
- No Vitest or Jest configuration was found at the repository root during this inspection.

From `playwright.config.ts`:

- E2E config uses a temporary `MHAF_DATA_DIR` and fake/unreachable LiveKit credentials.
- E2E config sets `DATABASE_URL` to an empty string and `SEED_DEMO_HOST=true`.
- E2E uses one worker and runs desktop, tablet, and mobile Edge projects.

Existing unit files inspected:

- `tests/unit/event-types-booking.test.ts`
- `tests/unit/livekit-webhook.test.ts`
- `tests/unit/booking-reminders.test.ts`

These currently test scheduling conflict-range logic, room-expiry helper logic, LiveKit event mapping, and reminder-window logic. They do **not** instantiate the main `db` repository or prove persistence behavior for all 41 methods.

The main repository is a module-level singleton. `MHAF_DATA_DIR` and the JSON file path are captured during module initialization. Tests must set the isolated data directory before importing the repository module and must not assume that changing the environment after import switches the active store.

## 3. Contract harness design

### 3.1 Shared adapter contract

Create a test-only contract suite with an adapter factory boundary. The contract suite should depend on a narrow repository interface and fixture helpers, not on JSON file internals or Prisma APIs.

Proposed test support layout:

```text
tests/
  contract/
    repository-contract.ts       # shared scenarios run against an adapter factory
    fixtures.ts                  # canonical users, event types, bookings, meetings
    assertions.ts                # date, ordering, relation, and error assertions
    adapters/
      json-adapter.ts            # wraps current db implementation for baseline
      prisma-adapter.ts         # added with the Prisma implementation
  unit/
    db-repository.contract.test.ts # node:test entry point / scenario runner
```

This is a proposed layout, not existing repository structure.

The contract suite should receive an adapter factory and isolated configuration. Do not bake `MHAF_DATA_DIR`, Prisma client creation, or environment selection into shared scenarios.

### 3.2 Isolating the current JSON singleton

For the first baseline, use a fresh child process and unique temporary `MHAF_DATA_DIR` per scenario (or per strictly isolated scenario group). Set the environment in the child process **before** importing `src/lib/db/index.ts`. This avoids module-cache/global-singleton leakage between tests.

The fixture must contain a valid, complete JSON database shape and known IDs. Do not rely on the default demo seed for assertions about exact records. Clean up only the temporary test directory.

If the test implementation instead uses one process, it must explicitly prove module isolation and reset behavior; do not assume deleting the JSON file resets the already-loaded in-memory singleton.

### 3.3 Prisma test isolation

The future Prisma adapter must use a dedicated disposable PostgreSQL database or isolated schema with a known migration revision. Never point contract tests at a production URL. Each scenario must reset its own rows or use a unique schema/database; parallel tests must not share mutable fixtures.

No database provisioning or migration is part of this documentation task.

### 3.4 Deterministic time and concurrency

- Prefer fixed timestamps in fixtures.
- Where repository methods call `new Date()` / `Date.now()` directly, introduce a testable clock seam only if needed and review that change separately; do not silently mock global time in a way that hides production behavior.
- For race tests, use independent repository instances/processes and a barrier so the competing operations overlap.
- A same-process `Promise.all` test only verifies the current in-process lock. It does not prove cross-process correctness.

## 4. Required contract matrix

Each row is a required behavior. Exact expected values should be encoded in shared assertions and run unchanged against both adapters.

| ID | Contract group | Scenarios and assertions | Relevant repository methods |
|---|---|---|---|
| AUTH-01 | User lookup and registration | Exact and mixed-case email lookup; duplicate mixed-case registration rejected; missing ID/email returns `null`; created user has default EventType and Monday–Friday availability in the supplied timezone | `findUserByEmail`, `findUserById`, `createUser` |
| AUTH-02 | Magic-link issuance | Token hash stored (never raw token); expiry retained; at most 3 requests in the rolling 15-minute window; old-token cleanup behavior; duplicate hash policy explicitly decided | `createMagicLinkToken`, `hasRecentMagicLinkToken`, `deleteMagicLinkToken` |
| AUTH-03 | Magic-link consumption | Missing, expired, consumed, and orphaned-user tokens return `null`; valid token verifies email; concurrent consumers yield exactly one non-null result | `consumeMagicLinkToken` |
| AUTH-04 | Sessions | Create and retrieve unexpired session with User; expired session and missing User return `null`; deletion is idempotent | `createSession`, `findSessionByToken`, `deleteSession` |
| EVT-01 | EventType reads and creation | Host scoping; active-only list; case-insensitive slug lookup; duplicate active slug gets deterministic suffix; inactive slug reuse policy explicitly tested; missing ID returns `null` | `getEventTypesByHostId`, `getEventTypeBySlug`, `getEventTypeById`, `createEventType`, `findEventTypeById` |
| AV-01 | Availability | Host scoping; replace-all semantics; empty list clears prior rows; multiple weekdays persist; returned values and timezone match inputs; a failed write leaves old rows intact | `getAvailabilityByHostId`, `updateAvailability`, `updateUserTimezone` |
| BOOK-01 | Booking reads | Host scoping and ascending start-time order; UID/ID lookups; expired management token returns `null`; valid hash+expiry returns only the matching booking | `getBookingsByHostId`, `getBookingByManagementTokenHash`, `getBookingByUid`, `findBookingById` |
| BOOK-02 | Booking creation and conflicts | Invalid/past range rejected; overlap boundaries; buffer-before/after; same host vs different host; MANUAL meeting conflict; cancelled/completed records excluded according to current rules; Booking and linked Meeting share UID and correct foreign relationship | `createBookingWithConflictLock` |
| BOOK-03 | Cross-process booking race | Two independent processes attempt overlapping bookings for one host; exactly one succeeds; no duplicate overlapping Booking/Meeting pair is committed | `createBookingWithConflictLock` |
| CHANGE-01 | Change request creation | Valid unexpired management token; only confirmed future bookings; invalid/past reschedule rejected; only one pending request per booking; request ownership/host copied from Booking | `createBookingChangeRequest` |
| CHANGE-02 | Change request reads and resolution | Host-scoped lookup/list and descending creation order; approve/reject lifecycle; approved cancellation updates linked Meeting; reschedule recalculates duration, rechecks booking + manual meeting conflicts, resets reminder markers; reject does not change Booking; repeated resolution rejected | `getBookingChangeRequestById`, `getBookingChangeRequestsByHostId`, `resolveBookingChangeRequest` |
| CHANGE-03 | Resolution rollback and race | Injected failure after partial mutation leaves request, Booking, Meeting, and reminder state unchanged; two hosts/processes cannot resolve the same pending request twice | `resolveBookingChangeRequest` |
| BOOK-04 | Management token and confirmation email | Token hash/expiry update; missing Booking error; email success sets timestamp and clears error; failure clears sent timestamp and records error; missing Booking behavior matches current no-op | `updateBookingManagementToken`, `updateBookingConfirmationEmail` |
| REM-01 | Reminder selection | Confirmed only; 15/5-minute windows; sent marker excludes repeat; past/invalid times excluded; deterministic order policy explicitly chosen | `getBookingsDueForReminders` |
| REM-02 | Reminder dispatch race | Two workers cannot both claim/send the same reminder; claim/mark behavior and failure/retry policy are explicit; do not rely on read-then-write alone | `markBookingReminderSent`, `getBookingsDueForReminders` |
| BOOK-05 | Booking cancellation | Host ownership enforced; Booking and linked Meeting both cancelled; wrong host/missing Booking returns the documented error; failure leaves both statuses unchanged | `cancelBooking` |
| MEET-01 | Meeting reads and creation | Host scoping and ascending start-time order; UID/ID lookup; invalid ranges rejected; MANUAL must be future; MANUAL conflicts with bookings and active meetings; INSTANT creation completes prior scheduled instant meeting(s) | `getMeetingsByHostId`, `getMeetingByUid`, `findMeetingById`, `createMeetingWithConflictLock` |
| MEET-02 | Meeting concurrency and cancellation | Independent processes cannot create overlapping MANUAL meetings; cancellation requires matching host and non-BOOKING source; BOOKING meeting cannot be cancelled through this method | `createMeetingWithConflictLock`, `cancelMeeting` |
| LK-01 | LiveKit webhook lifecycle | JOIN clears leave marker; LEAVE sets it; terminal states unchanged; unknown room still records event; repeated event ID returns `processed:false`; event ID ledger retention policy tested | `processLiveKitWebhookEvent` |
| LK-02 | Webhook cross-process idempotency | Same event ID submitted concurrently by independent workers updates lifecycle once; unique event record and room changes commit atomically; injected failure permits safe retry | `processLiveKitWebhookEvent` |
| ROOM-01 | Participant lifecycle | Leave updates active Booking and/or Meeting; join clears existing leave marker; terminal records unchanged; unknown UID returns false | `recordRoomParticipantLeave`, `recordRoomParticipantJoin` |
| ROOM-02 | Room expiry | Missing room, cancelled/completed state, no leave timestamp, exactly 15-minute boundary, over-15-minute boundary, rejoin reset; Booking and Meeting complete together with timestamps | `isRoomExpired` |
| ROOM-03 | Expiry race | Two independent requests evaluate expiry concurrently; state transition is idempotent; no stale request can undo a rejoin or overwrite a newer lifecycle timestamp | `isRoomExpired`, participant lifecycle methods |
| DATA-01 | Legacy import parity | Import fixture with all entities and optional fields; preserve IDs, UIDs, enum values, date instants, nulls, and all relations; verify row counts and representative reads after import | All persisted models |
| DATA-02 | Malformed/partial legacy input | Define explicit import behavior for missing optional collections, malformed JSON, invalid dates, and unknown enum values; import must report rejected rows rather than silently lose data | Import/bootstrap path |

## 5. Behavior decisions required before writing assertions

These are not assumptions to resolve inside tests. Product/engineering must explicitly decide and record them:

1. **Email canonicalization:** JSON lookup is case-insensitive, but should stored emails be lowercased or should the DB enforce case-insensitive uniqueness while preserving display form?
2. **EventType slug policy:** collision checks consider active EventTypes only. Can an inactive EventType share its slug with a new active one?
3. **Magic-link cleanup:** current pruning retains tokens whose expiry is within the last 24 hours (including expired-but-recent tokens) and deletes older ones. Is that retention behavior intentional?
4. **Magic-link duplicate hashes:** current JSON code does not explicitly reject an already-used token hash. Should the DB constraint enforce uniqueness?
5. **Reminder dispatch:** current API reads due reminders and later marks them sent. What is the required delivery guarantee and retry behavior if the process crashes after sending but before marking?
6. **Webhook retention:** JSON keeps at most 10,000 event IDs, dropping oldest IDs. What retention window is required in PostgreSQL?
7. **Room expiry boundary:** current check uses elapsed time **greater than** 15 minutes, not greater-than-or-equal. Keep or change?
8. **INSTANT meeting behavior:** current method completes prior scheduled instant meetings before creating the new one. Confirm this is intended and define failure rollback.
9. **Missing Booking email update:** current method silently returns if Booking does not exist. Preserve no-op or make missing record an error?
10. **Reminder ordering:** current method iterates stored bookings and does not explicitly sort due reminders. Should adapters preserve insertion order or define a stable chronological order?

Tests must lock in approved decisions, not silently normalize these differences.

## 6. Execution sequence

### Phase A — Baseline contract on JSON

1. Agree the ten behavior decisions in section 5.
2. Add the shared contract interface, fixtures, and assertions.
3. Run the suite against the JSON adapter using an isolated temporary data directory.
4. Record current behavior and identify mismatches with intended behavior.
5. Keep any behavior change separate from test-only baseline work.

### Phase B — Repository seam and Prisma adapter

1. Introduce a narrow repository interface/factory in a separate reviewed change.
2. Implement the Prisma adapter behind that interface without changing route behavior.
3. Configure a disposable PostgreSQL database for tests only.
4. Run the exact same contract scenarios against JSON and Prisma adapters.
5. Fix differences in the adapter or explicitly approved product behavior; do not weaken shared assertions to make a failing adapter pass.

### Phase C — Concurrency and migration validation

1. Run cross-process booking, meeting, token-consumption, reminder, webhook, change-resolution, and room-expiry race tests.
2. Test the additive migration against a disposable copy of a representative legacy JSON fixture.
3. Verify counts, uniqueness, relations, nullable fields, and representative round-trip reads.
4. Test rollback on failure and repeatability/idempotency of import.
5. Produce a parity report and require review before any cutover proposal.

## 7. Commands and environment

Current checked-in commands:

```bash
npm run test:unit
npm run test:e2e
```

The first implementation slice should add contract tests to the existing `node:test` runner. Do not add Vitest/Jest solely for this work unless a concrete limitation is demonstrated.

Prisma contract tests must require an explicit disposable test database URL and fail closed when it is absent or appears to target a production environment. The test suite must never infer a database URL from developer or deployment defaults.

## 8. Out of scope and safety gates

- This plan does not change the production adapter or enable Prisma for application traffic.
- No production database URL, credentials, user data, or deployment secrets may be read by the contract suite.
- No production migrations, data imports, or deployment are authorized by this plan.
- Do not run destructive database reset commands against any shared environment.
- Keep test-only harness changes separate from schema/migration implementation.
- PR review is required before Phase B introduces a repository interface or changes runtime initialization.
