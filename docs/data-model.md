# MHAF Live — Active Data Model

**Status:** describes the JSON store used by booking and meeting flows.
**Important:** `prisma/schema.prisma` is not the authoritative store for these operations in the current application.

## Storage and compatibility

`src/lib/db/` loads and persists `data/mhaf_live_db.json`. Date fields are serialized as ISO strings and reconstructed as `Date` objects on load. Legacy data without a `meetings` key is loaded with an empty meeting collection to preserve compatibility.

The store maintains the collections `users`, `sessions`, `eventTypes`, `availabilities`, `bookings`, `meetings`, and `auditLogs`.

## Active entities

### Booking

A booking represents a guest's confirmed slot for an event type. It includes `id`, `uid`, `eventTypeId`, `hostId`, `attendeeName`, `attendeeEmail`, `attendeeNotes`, `startTime`, `endTime`, `status`, `createdAt`, and `updatedAt`.

Booking states are `PENDING`, `CONFIRMED`, `CANCELLED`, and `COMPLETED`. An accepted public booking preserves its historical room identifier (`uid`) so existing links remain compatible.

### Meeting

A meeting is the event shown on the calendar and used to resolve a room link. It includes `id`, `uid`, `hostId`, `title`, `source`, `bookingId`, `attendeeName`, `attendeeEmail`, `startTime`, `endTime`, `status`, `createdAt`, and `updatedAt`.

- `source`: `BOOKING`, `MANUAL`, or `INSTANT`.
- `status`: `SCHEDULED`, `LIVE`, `CANCELLED`, or `COMPLETED`.
- `bookingId`: the related booking ID, or `null` for a meeting without a booking.
- For a public booking, the linked `Meeting` shares the booking UID, so historical `Booking` links continue to work.
- Manual and instant meetings have their own UID and do not create an artificial row in `bookings`.

### Other collections

`User` includes, among other fields, the host role and IANA time zone. `EventType` defines duration and before/after buffers. `Availability` stores weekly hours and their time zone. `Session` and `AuditLog` remain in the existing store.

## Relationships and conflicts

A `Booking` may be represented by a `Meeting` with source `BOOKING`; `bookingId` is the explicit relationship. The calendar aggregates meetings and then adds legacy bookings without a linked meeting, avoiding duplicates while retaining older records.

Booking creation revalidates the host, active event type, duration, time zone, notice period, and availability on the server. The locked mutation path checks conflicts with other bookings and meetings before saving linked records. Manual meeting creation also checks overlaps; instant meetings have a bounded duration.

**Operational limitation:** the lock is in memory and shared only within a single process. The JSON file and lock do not provide distributed ACID transactions, replica coordination, or multi-process concurrency guarantees. A move to PostgreSQL must add appropriate constraints and transactions and migrate existing data before using a multi-writer architecture.

## Prisma/PostgreSQL

The Prisma schema in the repository is a separate reference; its presence does not mean active bookings and meetings are written to PostgreSQL. Any migration of the active model must document the source of truth, room UID compatibility, `Booking`–`Meeting` relationships, date migration strategy, and uniqueness/conflict constraints.
