import assert from "node:assert/strict";
import test from "node:test";
import type { Booking, EventType } from "../../src/lib/db/types.ts";
import { getBookingConflictRange } from "../../src/lib/scheduling/conflicts.ts";

test("custom booking links protect buffers according to custom event type duration", () => {
  const customEventType: EventType = {
    id: "evt_custom_45",
    slug: "consultation-45",
    title: "Consultation 45 min",
    description: "Client session",
    durationMinutes: 45,
    bufferBeforeMin: 15,
    bufferAfterMin: 15,
    isActive: true,
    hostId: "host_usr_123",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const booking: Booking = {
    id: "b_1",
    uid: "uid_1",
    eventTypeId: customEventType.id,
    hostId: "host_usr_123",
    attendeeName: "Client VIP",
    attendeeEmail: "vip@client.com",
    attendeeNotes: "First assessment",
    startTime: new Date("2026-11-02T14:00:00.000Z"),
    endTime: new Date("2026-11-02T14:45:00.000Z"),
    status: "CONFIRMED",
    createdAt: new Date("2026-10-28T00:00:00.000Z"),
    updatedAt: new Date("2026-10-28T00:00:00.000Z"),
  };

  const map = new Map([[customEventType.id, customEventType]]);
  const range = getBookingConflictRange(booking, map);

  assert.ok(range);
  // Starts 15 min before 14:00 -> 13:45
  assert.equal(range.startMs, Date.parse("2026-11-02T13:45:00.000Z"));
  // Ends 15 min after 14:45 -> 15:00
  assert.equal(range.endMs, Date.parse("2026-11-02T15:00:00.000Z"));
});
