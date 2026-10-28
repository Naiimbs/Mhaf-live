import assert from "node:assert/strict";
import test from "node:test";
import type { Booking, EventType } from "../../src/lib/db/types.ts";
import {
  getBookingConflictRange,
  hasScheduledMeetingConflict,
  INSTANT_MEETING_DURATION_MS,
  isLegacyInstantBooking,
} from "../../src/lib/scheduling/conflicts.ts";

const eventType: EventType = {
  id: "evt_30min",
  slug: "30min",
  title: "30 minute meeting",
  description: null,
  durationMinutes: 30,
  bufferBeforeMin: 10,
  bufferAfterMin: 15,
  isActive: true,
  hostId: "host_1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking_1",
    uid: "booking-uid-1",
    eventTypeId: eventType.id,
    hostId: "host_1",
    attendeeName: "Guest",
    attendeeEmail: "guest@example.com",
    attendeeNotes: null,
    startTime: new Date("2026-10-28T10:00:00.000Z"),
    endTime: new Date("2026-10-28T10:30:00.000Z"),
    status: "CONFIRMED",
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
  };
}

const eventTypesById = new Map([[eventType.id, eventType]]);

test("active bookings protect their configured buffers", () => {
  const range = getBookingConflictRange(makeBooking(), eventTypesById);
  assert.deepEqual(range, {
    startMs: Date.parse("2026-10-28T09:50:00.000Z"),
    endMs: Date.parse("2026-10-28T10:45:00.000Z"),
  });
});

test("cancelled and completed bookings do not block new meetings", () => {
  for (const status of ["CANCELLED", "COMPLETED"] as const) {
    assert.equal(getBookingConflictRange(makeBooking({ status }), eventTypesById), null);
  }
});

test("legacy instant rooms are recognized by their persisted markers", () => {
  const legacy = makeBooking({
    id: "bkg_instant_123",
    uid: "instant-legacy-123",
    eventTypeId: "evt_instant",
    attendeeEmail: "instant@mhaf.live",
    attendeeNotes: "[instant] Legacy room",
    endTime: new Date("2026-10-29T10:00:00.000Z"),
  });
  assert.equal(isLegacyInstantBooking(legacy), true);
  assert.deepEqual(getBookingConflictRange(legacy, eventTypesById), {
    startMs: Date.parse("2026-10-28T10:00:00.000Z"),
    endMs: Date.parse("2026-10-28T10:00:00.000Z") + INSTANT_MEETING_DURATION_MS,
  });
});

test("legacy 24-hour instant bookings stop blocking after the current two-hour room window", () => {
  const legacy = makeBooking({
    id: "bkg_instant_123",
    uid: "instant-legacy-123",
    eventTypeId: "evt_instant",
    attendeeEmail: "instant@mhaf.live",
    attendeeNotes: "[instant] Legacy room",
    startTime: new Date("2026-10-28T08:00:00.000Z"),
    endTime: new Date("2026-10-29T08:00:00.000Z"),
  });
  const range = getBookingConflictRange(legacy, eventTypesById);
  assert.ok(range);
  assert.equal(range.endMs, Date.parse("2026-10-28T10:00:00.000Z"));
  const requestStartingAfterWindow = Date.parse("2026-10-28T11:00:00.000Z");
  assert.equal(range.startMs < requestStartingAfterWindow && range.endMs > requestStartingAfterWindow, false);
});

test("scheduled manual meetings conflict only with other active manual meetings", () => {
  const baseStart = Date.parse("2026-11-01T10:00:00.000Z");
  const baseEnd = Date.parse("2026-11-01T10:30:00.000Z");

  const instantMeeting = {
    id: "meet_instant_1",
    uid: "instant-uid-1",
    hostId: "host_1",
    title: "Instant meeting",
    source: "INSTANT",
    bookingId: null,
    attendeeName: null,
    attendeeEmail: null,
    startTime: new Date(baseStart),
    endTime: new Date(baseEnd),
    status: "SCHEDULED",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const manualMeeting = {
    id: "meet_manual_1",
    uid: "manual-uid-1",
    hostId: "host_1",
    title: "Manual scheduled meeting",
    source: "MANUAL",
    bookingId: null,
    attendeeName: "Jane",
    attendeeEmail: "jane@example.com",
    startTime: new Date(baseStart),
    endTime: new Date(baseEnd),
    status: "SCHEDULED",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 1. Instant meetings must never conflict with scheduled manual meetings
  assert.equal(
    hasScheduledMeetingConflict([instantMeeting], "host_1", baseStart, baseEnd),
    false
  );

  // 2. Active manual meeting at the same time must trigger a conflict
  assert.equal(
    hasScheduledMeetingConflict([manualMeeting], "host_1", baseStart, baseEnd),
    true
  );

  // 3. Cancelled or completed manual meetings do not conflict
  assert.equal(
    hasScheduledMeetingConflict([{ ...manualMeeting, status: "CANCELLED" }], "host_1", baseStart, baseEnd),
    false
  );
  assert.equal(
    hasScheduledMeetingConflict([{ ...manualMeeting, status: "COMPLETED" }], "host_1", baseStart, baseEnd),
    false
  );

  // 4. Meetings of a different host do not conflict
  assert.equal(
    hasScheduledMeetingConflict([manualMeeting], "host_other", baseStart, baseEnd),
    false
  );
});

