# MHAF Live — Persistence Contract Map

**Status:** Static implementation-planning artifact — review required  
**Baseline:** `master` source snapshot inspected 2026-10-31  
**Related work:** PR #42 caller inventory; PR #43 Prisma schema reconciliation  
**Scope:** Map the exported `db` repository methods to their data responsibilities, observed callers, consistency requirements, and test evidence.  
**Safety:** Documentation only. No runtime code, schema, database, credentials, or deployment configuration changed.

## 1. Reading this map

- **Read** means the method returns repository state without persisting a change.
- **Write** means it mutates repository state and persists it.
- **Multi-record** means a PostgreSQL implementation must preserve an all-or-nothing boundary across more than one entity/record.
- **Lock/atomic** records behavior currently serialized by the process-local `globalLock`; this is not cross-process protection.
- Caller paths are taken from the targeted caller inventory in PR #42 and the expanded route/page scan documented in PR #43. “No direct caller found” is not a dead-code conclusion.
- Test references identify relevant checked-in tests, not proof that every method has a direct unit test.

## 2. Method-by-method contract

| Method | Data responsibility | Operation | Consistency requirement / migration note | Observed caller(s) |
|---|---|---|---|---|
| `findUserByEmail` | Find User by email, case-insensitive | Read | Preserve case-insensitive comparison; decide normalized storage or case-insensitive DB uniqueness | `src/lib/auth/session.ts`; `src/app/api/auth/magic-link/route.ts` |
| `findUserById` | Find User by primary ID | Read | Primary-key lookup; callers rely on null when absent | Scheduling service; schedule/manage/reminder/email routes; room page |
| `createUser` | Insert User, default EventType, and weekday Availability rows | Multi-record write | One DB transaction; enforce case-insensitive duplicate-email rule; seed defaults atomically | Auth/session service; magic-link route |
| `createMagicLinkToken` | Prune old tokens, enforce request-rate limit, insert token | Write | Atomic rate-limit check + insert; unique token hash; retain expiry/consumption timestamps | `src/app/api/auth/magic-link/route.ts` |
| `hasRecentMagicLinkToken` | Check recent token requests for user | Read | Time-window query; note request path also uses token-creation rate limit | Magic-link route |
| `deleteMagicLinkToken` | Delete token by ID | Write | Idempotent delete; current JSON implementation persists only if a row was removed | Magic-link route |
| `consumeMagicLinkToken` | Validate token, mark consumed, verify User email | Multi-record write | Single atomic conditional consume; only one concurrent request may consume a token | `src/app/api/auth/magic-link/verify/route.ts` |
| `createSession` | Insert session | Write | Unique session token; FK to User; expiry retained | `src/lib/auth/session.ts` |
| `findSessionByToken` | Find unexpired session and hydrate User | Read | Query must enforce expiry and return related User | Auth/session service |
| `deleteSession` | Delete session by token | Write | Idempotent delete; current JSON path persists after filtering | Auth/session service |
| `getEventTypesByHostId` | List active EventTypes for host | Read | Filter by host and active flag | Calendar route; event-types route; dashboard page |
| `getEventTypeBySlug` | Find active host EventType by case-insensitive slug | Read | Preserve case-insensitive match and active-only behavior; no direct runtime caller found in inspected source | No direct runtime caller found |
| `getEventTypeById` | Find EventType by ID | Read | Primary-key lookup | `src/app/rooms/[slug]/page.tsx` |
| `createEventType` | Create active EventType and derive a unique slug | Write | Host-scoped slug collision handling; clarify whether inactive slugs reserve names and preserve case behavior | `src/app/api/schedule/event-types/route.ts` |
| `getAvailabilityByHostId` | List host Availability rows | Read | Host-scoped query; preserve multiple weekday rows if present | `src/app/api/schedule/availability/route.ts` |
| `updateAvailability` | Replace all host Availability rows | Multi-record write | Delete + inserts must be one transaction; preserve current replace-all semantics | Availability route |
| `updateUserTimezone` | Update User timezone and updatedAt | Write | Single-row update; missing User is an error | Auth settings; availability route |
| `getBookingsByHostId` | List host Bookings ordered by start time | Read | Host-scoped ordered query; confirm status filtering remains absent | Calendar; bookings routes |
| `getBookingByManagementTokenHash` | Find Booking with matching, unexpired management token | Read | Token hash lookup and expiry predicate; never expose raw token | Schedule manage route |
| `getBookingByUid` | Find Booking by public UID | Read | UID must remain uniquely addressable | Connection-details route; confirmation page; room page |
| `findBookingById` | Find Booking by internal ID | Read | Primary-key lookup; one caller is loaded dynamically | Bookings route; booking route (including dynamic import); booking-email route |
| `findEventTypeById` | Find EventType by ID | Read | Primary-key lookup; used during booking, management, and reminder flows | Scheduling service; booking/bookings/manage/reminder/email routes |
| `createBookingWithConflictLock` | Check booking/meeting conflicts and create Booking (and associated meeting state as implemented) | Critical write | Preserve buffer-aware conflict rules; process-local lock is insufficient for multi-process DB; use transaction plus cross-process serialization/exclusion strategy | `src/lib/scheduling/booking.ts` |
| `createBookingChangeRequest` | Validate management token and create CANCEL/RESCHEDULE request | Write | Validate token and insert request atomically; preserve allowed request/status semantics | Schedule manage route |
| `getBookingChangeRequestById` | Find host-owned change request by ID | Read | Scope query by both request ID and host ID | Bookings route |
| `getBookingChangeRequestsByHostId` | List host change requests newest first | Read | Host-scoped ordered query | Bookings route; schedule manage route |
| `resolveBookingChangeRequest` | Resolve request and apply approved booking/meeting changes | Multi-record write | One transaction for request status, Booking/Meeting changes and related lifecycle/reminder state; re-check conflicts within transaction | Bookings route |
| `updateBookingManagementToken` | Set management-token hash and expiry on Booking | Write | Atomic update; persist only hash and expiry | Booking-email route |
| `updateBookingConfirmationEmail` | Record confirmation-email success timestamp or failure message | Write | Persist delivery result; define retry semantics and avoid marking sent before provider success | Booking route; booking-email route |
| `getBookingsDueForReminders` | Select bookings due for 15- or 5-minute reminder | Read | Preserve dispatch windows, status/time eligibility, and unsent-marker filtering; concurrent workers need claim/deduplication strategy | Internal booking-reminders route |
| `markBookingReminderSent` | Set 15- or 5-minute reminder sent timestamp | Write | Atomic conditional marker update to prevent duplicate delivery across workers | Internal booking-reminders route |
| `cancelBooking` | Cancel host-owned Booking and linked Meeting | Multi-record write | One transaction; preserve host ownership check and rollback semantics | Bookings route |
| `getMeetingsByHostId` | List host Meetings ordered by start time | Read | Host-scoped ordered query | Calendar route |
| `getMeetingByUid` | Find Meeting by public UID | Read | UID must remain uniquely addressable | Connection-details route; room page |
| `findMeetingById` | Find Meeting by internal ID | Read | Primary-key lookup; no direct runtime caller found in inspected source | No direct runtime caller found |
| `createMeetingWithConflictLock` | Create MANUAL/INSTANT Meeting after conflict checks; INSTANT flow may complete prior instant meetings | Multi-record write | Preserve booking/meeting conflict rules; transaction + cross-process lock; status changes and insert must commit together | Meetings route; instant-room route |
| `cancelMeeting` | Cancel host-owned non-BOOKING Meeting | Write | Preserve ownership and source restriction; atomic status update | Meetings route |
| `processLiveKitWebhookEvent` | Deduplicate provider event and update room/booking/meeting lifecycle for JOIN/LEAVE | Multi-record write | Unique event ID + transaction; concurrent webhook retries must process once; define durable retention | LiveKit webhook route |
| `recordRoomParticipantLeave` | Set last-left timestamp on active Booking/Meeting matching room UID | Multi-record write | Atomic update across matching Booking/Meeting; no direct runtime caller found in inspected source | No direct runtime caller found |
| `recordRoomParticipantJoin` | Clear last-left timestamp on active Booking/Meeting matching room UID | Multi-record write | Atomic update across matching Booking/Meeting; no direct runtime caller found in inspected source | No direct runtime caller found |
| `isRoomExpired` | Check completion/last-left timeout and may complete Booking and Meeting | Multi-record read/write | Read + conditional state transition must be atomic to avoid stale concurrent expiry decisions | Connection-details route; room page |

## 3. Test evidence found in the inspected snapshot

This is a behavior-level cross-reference. The checked-in suite does not currently demonstrate one direct unit test per repository method.

| Test file | Observed coverage | What it does not establish |
|---|---|---|
| `tests/phase2-scheduling-auth.spec.ts` | Magic-link registration/verification and replay rejection; timezone-aware slot generation; invalid booking rejection; concurrent identical booking requests produce one success and one conflict; public booking flow | Does not prove DB-backed multi-process conflict safety; it exercises the current application test runtime |
| `tests/unit/event-types-booking.test.ts` | Custom booking links and buffer behavior; room expiry after participant exit | Does not cover every EventType/Booking repository method |
| `tests/unit/livekit-webhook.test.ts` | Verified participant JOIN mapping, final participant LEAVE behavior, room-finished mapping, incomplete event handling | Does not alone prove durable webhook idempotency under concurrent DB workers |
| `tests/unit/booking-reminders.test.ts` | 15/5-minute due windows, sent-marker exclusion, dispatch-window boundaries, invalid/past times | Does not prove concurrent worker claiming or DB-level deduplication |
| `tests/phase3-livekit-room.spec.ts` | Room lookup/access, scheduled access timing, instant room creation, guest/host token behavior, room UI leave flow | Does not assert every persistence lifecycle method or a multi-process webhook race |
| `tests/fallback-crash-safety.spec.ts` | Separate demo-request JSON fallback idempotency, write-failure recovery, malformed JSON preservation and concurrent reconciliation | Applies to `src/lib/db/demo-requests.ts`, not the 41-method main `db` repository |

### 3.1 Contract tests required before repository replacement

Add focused tests against the repository contract (first against the current adapter, then run unchanged against the Prisma adapter) for:

1. Mixed-case email lookup and duplicate registration.
2. Magic-link request-rate limit, expiry, one-time concurrent consumption, and cleanup.
3. Session expiry and deletion.
4. Host-scoped EventType slug collision, case-insensitive lookup, inactive slug policy.
5. Availability replace-all atomicity and timezone update.
6. Booking conflict boundaries including before/after buffers and MANUAL meetings; concurrent requests from separate application processes.
7. Booking change request ownership, approval/rejection, reschedule conflict re-check, and rollback on partial failure.
8. Confirmation-email failure/success state and reminder marker idempotency with concurrent workers.
9. Booking/Meeting cancellation ownership and linked-record consistency.
10. LiveKit webhook event replay/concurrency and JOIN/LEAVE lifecycle updates.
11. Room re-entry, 15-minute expiry boundary, and simultaneous expiry checks.
12. JSON import parity for IDs, UIDs, timestamps, nullable fields, enums, and existing relationships.

## 4. Migration design implications

- **Transactions:** `createUser`, `consumeMagicLinkToken`, `updateAvailability`, `resolveBookingChangeRequest`, `cancelBooking`, `createMeetingWithConflictLock`, `processLiveKitWebhookEvent`, `recordRoomParticipantLeave`, `recordRoomParticipantJoin`, and `isRoomExpired` require deliberate transaction boundaries or atomic conditional statements.
- **Cross-process concurrency:** booking/meeting conflict checks, magic-link rate limits/consumption, reminder dispatch, and webhook idempotency cannot rely on the current process-local `AsyncLock`.
- **Indexes/constraints:** candidate lookup keys include normalized User email, host + active EventType slug policy, session token, magic-link token hash, Booking UID, management-token hash, host/time booking queries, Meeting UID, webhook event ID, and host/status change-request queries. Final index design depends on the decisions in PR #43.
- **Behavior parity:** do not translate JSON array filtering mechanically into ORM calls without preserving ordering, case sensitivity, null handling, expiry rules, status restrictions, and error behavior.
- **Out of scope:** this document does not prescribe a final Prisma schema or authorize schema/runtime changes.

## 5. Unresolved dispositions and limitations

The following methods have no direct runtime caller in the inspected source set: `getEventTypeBySlug`, `findMeetingById`, `recordRoomParticipantLeave`, and `recordRoomParticipantJoin`. Keep them in the contract pending a deliberate decision; absence of a direct caller is not proof they are safe to remove.

Caller paths are a targeted source-level inventory, not proof of production execution. Reflection, string-keyed access, external consumers, generated code, or future branches may add usage. Test references are grouped by behavior and do not imply method-level coverage where not explicitly asserted.

## 6. Explicit non-actions

- No TypeScript runtime code, Prisma schema, SQL migration, or test code was changed.
- No database was connected, inspected, migrated, or written.
- No secrets, tokens, or user records were accessed.
- No deployment was performed.
- PR #42 remains separate; PR #43 remains a draft pending review.
