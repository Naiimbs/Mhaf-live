# MHAF Live — Persistence Inventory (Phase 1)

**Status:** Initial repository inventory  
**Baseline:** `master` at `d87bbe876f2f8277df33cf5947b086a7f8cbebbc`  
**Scope:** Read-only inspection before PostgreSQL migration  
**No runtime behavior or data was changed while preparing this inventory.**

## 1. Findings at a glance

The repository already has a PostgreSQL Prisma schema and one initial migration, but the main application repository remains JSON-backed.

| Area | Observed implementation | Migration implication |
|---|---|---|
| Main application domain | `src/lib/db/index.ts` reads/writes `data/mhaf_live_db.json` | Replace the repository implementation, not just add tables |
| Prisma client | `src/lib/db/prisma.ts` exports a singleton client | Reuse this client for the PostgreSQL repository |
| Prisma schema | User, Session, EventType, Availability, Booking, AuditLog, DemoRequest | Incomplete relative to live TypeScript domain types |
| Prisma migrations | One tracked initial migration: `20261026000000_init` | Inspect migration history and verify migration metadata before applying new migrations |
| Demo requests | Prisma first, JSON fallback on DB failure | Consolidate to PostgreSQL after controlled fallback-data import |
| Rate limiting | Process-local maps in DemoRequest and other rate-limit utilities | Not shared between processes; assess separately before horizontal scaling |
| Booking concurrency | Process-local `AsyncLock` plus in-memory conflict checks | Must become transaction/constraint-backed in PostgreSQL |
| LiveKit webhook idempotency | JSON array of processed event IDs | Requires unique durable event ID in PostgreSQL |

## 2. Main JSON store inventory

The `DatabaseSchema` in `src/lib/db/index.ts` currently persists these collections:

- `users`
- `sessions`
- `magicLinkTokens`
- `eventTypes`
- `availabilities`
- `bookings`
- `bookingChangeRequests`
- `meetings`
- `auditLogs`
- `processedLiveKitWebhookEvents`

The store deserializes date fields when loading and writes the complete object to a temporary file before renaming it into place. The lock is process-local. The loader catches read/parse failures and returns an empty data structure; this must be changed to explicit, recoverable failure behavior before removing the JSON store. Startup also seeds a default host, event type, and weekday availability when no users exist.

## 3. Current repository API — 41 methods

The JSON-backed `db` object exposes 41 async methods. Preserve the public service contract during the first repository replacement where practical.

### Identity and authentication

- `findUserByEmail`
- `findUserById`
- `createUser`
- `createMagicLinkToken`
- `hasRecentMagicLinkToken`
- `deleteMagicLinkToken`
- `consumeMagicLinkToken`
- `createSession`
- `findSessionByToken`
- `deleteSession`

### Event types and availability

- `getEventTypesByHostId`
- `getEventTypeBySlug`
- `getEventTypeById`
- `createEventType`
- `getAvailabilityByHostId`
- `updateAvailability`
- `updateUserTimezone`

### Booking and booking-change lifecycle

- `getBookingsByHostId`
- `getBookingByManagementTokenHash`
- `getBookingByUid`
- `findBookingById`
- `findEventTypeById`
- `createBookingWithConflictLock`
- `createBookingChangeRequest`
- `getBookingChangeRequestById`
- `getBookingChangeRequestsByHostId`
- `resolveBookingChangeRequest`
- `updateBookingManagementToken`
- `updateBookingConfirmationEmail`
- `getBookingsDueForReminders`
- `markBookingReminderSent`
- `cancelBooking`

### Meeting and room lifecycle

- `getMeetingsByHostId`
- `getMeetingByUid`
- `findMeetingById`
- `createMeetingWithConflictLock`
- `cancelMeeting`
- `processLiveKitWebhookEvent`
- `recordRoomParticipantLeave`
- `recordRoomParticipantJoin`
- `isRoomExpired`

This inventory enumerates the methods declared by the main store. A complete caller-to-method map is still a required follow-up before implementation; do not infer that this list is the full list of application call sites.

## 4. TypeScript-to-Prisma reconciliation gaps

The current TypeScript interfaces in `src/lib/db/types.ts` do not map one-to-one to the current Prisma schema.

| TypeScript domain | Important fields/behavior | Current Prisma status |
|---|---|---|
| User | Required `passwordHash`; nullable `name`; role and timezone | Model exists, but Prisma currently makes `passwordHash` and `name` optional |
| Session | Unique session token, user, expiry | Model exists |
| MagicLinkToken | `tokenHash`, user, expiry, consumedAt | Missing |
| EventType | Host-scoped slug, duration and before/after buffers | Model exists |
| Availability | Weekday, HH:mm range, timezone | Model exists |
| Booking | UID, attendee details, time range, status, management token, email/reminder timestamps, room leave/completion fields | Model exists, but multiple live fields are missing |
| BookingChangeRequest | CANCEL/RESCHEDULE, pending/approved/rejected, requested time, host response and resolution timestamps | Missing |
| Meeting | BOOKING/MANUAL/INSTANT source, lifecycle status, booking link, attendee, room UID, time range, leave/completion timestamps | Missing |
| Processed webhook event | Durable idempotency by LiveKit event ID | Missing |
| AuditLog | Actor, action, target, IP, user agent, timestamp | Model exists |
| DemoRequest | Lead details and metadata | Model exists; runtime still has JSON fallback |

The initial SQL migration creates the current schema tables and indexes, but it does not create the missing domain models or the additional Booking fields listed above. It also has no database-level exclusion/locking mechanism for overlapping booking intervals.

## 5. Existing migration baseline

Tracked migration directory observed:

- `prisma/migrations/20261026000000_init/migration.sql`

The tracked tree did not show a `prisma/migrations/migration_lock.toml` file at the time of this inventory. Verify the local and deployed migration metadata before generating or applying the next migration. Do not baseline, reset, or apply migrations to a production database as part of this inventory.

## 6. Known runtime entry points inspected

The following files demonstrate important call paths and should be included in the complete caller inventory:

- `src/lib/auth/session.ts`: user lookup, session creation, session validation, session deletion, host registration.
- `src/lib/scheduling/booking.ts`: host/event-type reads, availability validation, booking creation.
- `src/app/api/meetings/route.ts`: meeting create/cancel.
- `src/app/api/connection-details/route.ts`: booking/meeting lookup and room-expiry checks before token minting.
- `src/app/api/livekit/webhook/route.ts`: verified webhook event passed to persistent idempotency/lifecycle handler.
- `src/lib/db/demo-requests.ts`: separate Prisma path with JSON fallback and process-local rate limiting.

A repo-wide caller map is still pending. Complete it before changing the `db` implementation so no call site is missed.

## 7. Migration sequence recommended from this inventory

1. Complete a caller-to-method map for all 41 repository methods, including pages, route handlers, server actions, scheduled jobs, and tests.
2. Confirm the deployed PostgreSQL schema and `_prisma_migrations` state from a read-only inspection; confirm migration metadata and backups before any write.
3. Reconcile Prisma models and enums against TypeScript types and the approved data model. Decide whether the existing `Meeting` concept maps to one model or a room/session pair.
4. Add missing models/fields through additive migrations on a disposable PostgreSQL database.
5. Implement a Prisma-backed repository behind the current service contract.
6. Move multi-record mutations to transactions; implement cross-process booking conflict protection and unique webhook event persistence.
7. Build and dry-run an idempotent JSON importer. Validate counts, IDs, relations, timestamps, and enum mappings.
8. Test backup/restore, malformed-source recovery, and one-time host bootstrap behavior.
9. Switch runtime reads/writes only after verification; remove JSON fallback only after a controlled cutover.
10. Run full CI against PostgreSQL, then validate in staging before considering production deployment.

## 8. Explicit non-actions

This inventory does not:
- merge any open pull request;
- alter application code or runtime behavior;
- inspect, copy, or modify production data;
- run `prisma migrate deploy`, `db push`, or destructive database commands;
- change credentials, LiveKit settings, or deployment configuration;
- deploy to staging or production.
