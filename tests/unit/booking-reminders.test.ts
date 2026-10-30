import assert from "node:assert/strict";
import test from "node:test";
import { getDueBookingReminderOffsets } from "../../src/lib/scheduling/reminders.ts";

const start = new Date("2030-01-01T10:00:00.000Z");

test("booking reminder is due in the 15-minute window", () => {
  assert.deepEqual(
    getDueBookingReminderOffsets(start, new Date("2030-01-01T09:45:00.000Z"), { fifteenMinute: false, fiveMinute: false }),
    [15],
  );
});

test("booking reminder is due in the 5-minute window", () => {
  assert.deepEqual(
    getDueBookingReminderOffsets(start, new Date("2030-01-01T09:55:00.000Z"), { fifteenMinute: true, fiveMinute: false }),
    [5],
  );
});

test("sent reminders are never selected again", () => {
  assert.deepEqual(
    getDueBookingReminderOffsets(start, new Date("2030-01-01T09:55:00.000Z"), { fifteenMinute: true, fiveMinute: true }),
    [],
  );
});

test("reminders outside the three-minute dispatch window are skipped", () => {
  assert.deepEqual(
    getDueBookingReminderOffsets(start, new Date("2030-01-01T09:48:01.000Z"), { fifteenMinute: false, fiveMinute: false }),
    [],
  );
});

test("past or invalid meeting times are never reminded", () => {
  assert.deepEqual(
    getDueBookingReminderOffsets(start, new Date("2030-01-01T10:00:00.000Z"), { fifteenMinute: false, fiveMinute: false }),
    [],
  );
  assert.deepEqual(
    getDueBookingReminderOffsets(new Date("invalid"), new Date("2030-01-01T09:45:00.000Z"), { fifteenMinute: false, fiveMinute: false }),
    [],
  );
});
