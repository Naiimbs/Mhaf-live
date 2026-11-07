# MHAF Live — Current Architecture

**Status:** Calendar and meeting functionality is implemented; review and production-release decisions remain separate steps.
**Source of truth:** the running code under `src/`, not the Prisma schema or older architecture diagrams.

## Overview

MHAF Live is a Next.js App Router application. The public experience, booking flow, host workspace, and LiveKit client are served through the Next.js application. LiveKit provides media connectivity; the server signs access tokens and does not send the signing secret to the browser.

Bookings and meetings currently use the JSON store in `src/lib/db/`, persisted to `data/mhaf_live_db.json`. Prisma/PostgreSQL is present in the repository for separate uses and as a possible migration path, but it is not the authoritative transactional store for these flows.

## User flows and routes

| Flow | Main route | Control |
|---|---|---|
| Introduce the product | `/` | Informational public page; no live room or booking is created there. |
| Register or sign in | `/register`, `/login` | Host authentication protects management actions. |
| Manage the calendar | `/dashboard` | Week is displayed in the host's IANA time zone and aggregates bookings and meetings. |
| Use a public booking link | `/book/[hostSlug]/[eventSlug]` | The server validates the host, event type, availability, duration, notice period, and conflicts. |
| Create a meeting without a booking | `POST /api/meetings` | Authenticated host; local time, duration, and overlaps are validated. |
| Start an instant meeting | `POST /api/rooms/instant` | Authenticated host; creates a time-bounded meeting without a synthetic booking. |
| Load calendar events | `GET /api/calendar` | Authenticated host; returns only that host's events. |
| Join a room | `/rooms/[slug]` and `/api/connection-details` | The UID must match a persisted booking or meeting; an unknown UID does not create a room. |

An accepted public booking creates a `Booking` and a linked `Meeting` with source `BOOKING`. A manual or instant meeting creates a `Meeting` without a `Booking`. These resources are not interchangeable.

## Persistence and concurrency guarantees

The JSON store keeps dates as ISO strings on disk and restores them as `Date` objects in memory. Critical mutations use an in-memory asynchronous lock; booking creation and its linked meeting, meeting creation, cancellation, and persistence are handled in that protected path.

**Important limitation:** the lock coordinates requests only within one Node.js process. It does not guarantee uniqueness across multiple processes or replicas and is not a replacement for a PostgreSQL transaction. Do not claim cross-replica ACID guarantees or deploy multiple writers with this store.

## Room and slot security

- Calendar and creation APIs require a host session; IDs supplied by the browser alone do not establish ownership.
- The server issues LiveKit tokens after resolving the booking or meeting, its status, and the requester's role.
- A scheduled meeting cannot be joined before the window defined by the server-side `ENFORCE_MEETING_TIME_WINDOW` setting. Browser query or body parameters cannot disable this rule.
- Slots are calculated using the host's IANA time zone and displayed in the visitor's time zone; nonexistent local times during daylight-saving transitions are rejected.
- The interface reports a participant as connected only after LiveKit connects; failure and reconnect states remain visible.

## Implemented and unimplemented scope

The calendar, bookings, manual and instant meetings, room access authorization, and LiveKit client are present in the code. Attendance webhooks, attendance dashboards, recording/archival, transcripts, and AI summaries described in some historical documents are not delivered and must not be presented as available features.

## Local verification

The branch was checked with `npm run build`, five time-zone unit tests, and 23 targeted Playwright tests covering the landing page, calendar workspace, bookings, authentication, and rooms. Tests use local data; they do not prove multi-process concurrency guarantees or production LiveKit availability.
