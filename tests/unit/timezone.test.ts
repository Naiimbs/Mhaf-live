import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocalDateString,
  getWeekdayForLocalDate,
  isValidTimeZone,
  localDateTimeToUtc,
} from "../../src/lib/scheduling/timezone.ts";

test("converts host wall-clock time to the correct UTC instant", () => {
  assert.equal(
    localDateTimeToUtc("2026-10-27", "09:00", "Africa/Tunis")?.toISOString(),
    "2026-10-27T08:00:00.000Z"
  );
});

test("uses host-local date and weekday independently of runtime timezone", () => {
  const instant = new Date("2026-10-26T23:30:00.000Z");
  assert.equal(getLocalDateString(instant, "Africa/Tunis"), "2026-10-27");
  assert.equal(getWeekdayForLocalDate("2026-10-27"), 2);
});

test("rejects nonexistent local times during a daylight-saving gap", () => {
  assert.equal(localDateTimeToUtc("2026-03-08", "02:30", "America/New_York"), null);
});

test("chooses the earlier instant for an ambiguous daylight-saving fold", () => {
  assert.equal(
    localDateTimeToUtc("2026-11-01", "01:30", "America/New_York")?.toISOString(),
    "2026-11-01T05:30:00.000Z"
  );
});

test("rejects malformed dates and unknown time zones", () => {
  assert.equal(localDateTimeToUtc("2026-02-30", "09:00", "UTC"), null);
  assert.equal(localDateTimeToUtc("2026-10-27", "09:00", "Mars/Olympus"), null);
  assert.equal(isValidTimeZone("Mars/Olympus"), false);
});
